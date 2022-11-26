import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, mult, rotateX, rotateY, rotateZ, translate, scalem, inverse } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
/** @type WebGLRenderingContext */
let gl;

let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)

let mView;              // ModelView
let mModel;             // Model matrix

/*    HELICOPTER VARIABLES    */
let currentSpeed = 0;   // Current helicopter speed
let height = 0;         // Helicopter height
let helicopterAngle = 270;  // Angle of rotation of the helicopter on Y axis
let movement = false;   // True if the helicopter is moving horizontally
let heightChange = 0;   // 1 if height is increasing , -1 if height is decreasing and 0 if height is not changing
let point;              // Stores the exact position of the helicopter
let propelorRotation = 0;   // Propelor rotation angle
let propelorRotationSpeed = 0;  // Propelor rotation speed

/*    BOX VARIABLES    */
let maxBoxes = 1;       // Max number of boxes
let boxIndex = 0;       // Index of the current box
let boxValue = [];      // True if the box is being shown
let boxPoint = [];      // Position of the box
let boxAngle = [];      // Boxes' angle of rotation on the Y axis
let boxSpeedY = [];     // Vertical speed of the box
let boxSpeedZ = [];     // Horizontal speed of the box
let boxPositionZ = [];  // Horizontal position of the box, considering its original position

/*    PROJECTION/VIEW VARIABLES    */
let axonometric = true; // True if axonometric projection is on
let angleGamma = 0;     // Rotation on X axis for axonometric projection
let angleTheta = 0;     // Rotation on Y axis for axonometric projection
let fpv = false;        // True if first person view is on
let fpvAt;              // Where the helicopter camera should look
let input = false;      // True if a value is being introduced for the modifiable parameters

/*    CONSTANTS    */
const CITY_WIDTH = 50;  // Width of the city
const SPEED_CHANGE = 0.05;  // Speed increment/decrement
const MAX_SPEED = 1.5;  // Max speed of the helicopter
const PROPELOR_SPEED_FACTOR = 5;    // Multiplying factor for the propelor speed when the helicopter is moving vertically
const BASE_PROPELOR_SPEED = 15;     // Propelor speed when the helicopter is not moving vertically
const INCLINE_MULTIPLIER = 20;    // So that the maximum incline the helicopter can have is 30 degrees (20*MAX_SPEED = 30)
const MAX_HEIGHT = 35;  // Max height of the helicopter
const MIN_HEIGHT = 3/40;    // Min height of the helicopter
const MIN_MOVEMENT_HEIGHT = 1.5;    // Min height of the helicopter while moving horizontally
const MIN_BOX_HEIGHT = 1.5; // Min height for the boxes
const HEIGHT_CHANGE = 0.2;  // Height increment/decrement
const GRAVITATIONAL_ACCELERATION = 1.1; // Gravity action factor for the boxes
const AIR_FRICTION = 0.9;   // Air friction affecting the boxes
const SIDE_WALK_TILES = 20; // Number of tiles for the main side walk
const SIDE_WALK_TILES_SECONDARY = 12;   // Number of tiles for the secondary side walk
const HOUSE_ROOF_TILES = 4; // Number of tiles on the roof of the houses
const CHRISTMAS_TREES = 8;  // Number of christmas trees
const BUILDING_HEIGHT = 40; // Height of the central building

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-CITY_WIDTH*aspect,CITY_WIDTH*aspect, -CITY_WIDTH, CITY_WIDTH,-6*CITY_WIDTH,6*CITY_WIDTH);

    mode = gl.TRIANGLES;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    for(let i = 0; i < maxBoxes; i++) {
        boxValue[i] = false;
        console.log(i + " - " + boxValue[i]);
    }

    document.onkeydown = function(event) {
        if (!input) {
            switch(event.key) {
                case '1':
                    fpv = false;
                    axonometric = true;
                    break;
                case '2':
                    // Front view
                    axonometric = false;
                    fpv = false;
                    mView = lookAt([0, 0, 1], [0, 0, 0], [0, 1, 0]);
                    break;
                case '3':
                    // Top view
                    axonometric = false;
                    fpv = false;
                    mView = lookAt([0, 1, 0], [0, 0, 0], [0, 0, -1]);
                    break;
                case '4':
                    // Right view
                    axonometric = false;
                    fpv = false;
                    mView = lookAt([1, 0, 0], [0, 0, 0], [0, 1, 0]);
                    break;
                case '5':
                    axonometric = false;
                    fpv = true;
                    break;
                case 'w':
                    mode = gl.LINES; 
                    break;
                case 's':
                    mode = gl.TRIANGLES;
                    break;
                case "ArrowUp":
                    if (height < MAX_HEIGHT)
                    heightChange = 1;
                    break;
                case "ArrowDown":
                    if (height > MIN_HEIGHT)
                        heightChange = -1;
                    break;
                case "ArrowLeft":
                    movement = true;
                    break;
                case " ":
                    if (height >= 4) {
                        updateIndex();
                        if(!boxValue[boxIndex]) {
                            boxPoint[boxIndex] = point;
                            boxPoint[boxIndex][1] -= 2; // So that the box doesn't start above the helicopter
                            boxSpeedY[boxIndex] = 0.1;
                            boxValue[boxIndex] = true;
                            boxAngle[boxIndex] = helicopterAngle;
                            boxSpeedZ[boxIndex] = currentSpeed;
                            boxPositionZ[boxIndex] = 0;
                            setTimeout(hideBox, 5000, boxIndex);
                        }
                    }
                    break;
            }
        }
        else {
            if (event.key == "Enter") input = false;
        }
    }

    document.onkeyup = function(event) {
        switch(event.key) {
            case "ArrowLeft":
                movement = false;
                break;
            case "ArrowUp":
                heightChange = 0;
                break;
            case "ArrowDown":
                heightChange = 0;
                break;
        }
    }

    const textInputs = document.getElementsByClassName("textInputs");
    for(let i = 0; i < textInputs.length; i++) {
        textInputs[i].addEventListener("click", function() {
            input = true;
        })

        textInputs[i].addEventListener("change", function() {
            input = false;
        })

    }

    document.querySelector("canvas").addEventListener("click", function() {
        input = false;
    })

    document.getElementById("textInputGamma").addEventListener("input", function() {
        document.getElementById("sliderGamma").value = this.value;
        angleGamma = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("sliderGamma").addEventListener("input", function() {
        document.getElementById("textInputGamma").value = this.value;
        angleGamma = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("textInputTheta").addEventListener("input", function() {
        document.getElementById("sliderTheta").value = this.value;
        angleTheta = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("sliderTheta").addEventListener("input", function() {
        document.getElementById("textInputTheta").value = this.value;
        angleTheta = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("textInputBoxes").addEventListener("input", function() {
        document.getElementById("sliderBoxes").value = this.value;
        maxBoxes = this.value;
    })

    document.getElementById("sliderBoxes").addEventListener("input", function() {
        document.getElementById("textInputBoxes").value = this.value;
        maxBoxes = this.value;
    })

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
    CYLINDER.init(gl);
    PYRAMID.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);

    function updateIndex() {
        let i = 0;
        while(i < maxBoxes && boxValue[i]) {
            i++
        }
        boxIndex = i;
    }

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-CITY_WIDTH*aspect,CITY_WIDTH*aspect, -CITY_WIDTH, CITY_WIDTH,-6*CITY_WIDTH,6*CITY_WIDTH);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function updateComponentColor(newColor){
        const color = gl.getUniformLocation(program, "color");
        let newColorVec3 = vec3();
        switch(newColor){
            case "red": newColorVec3 = vec3(1,0,0); break;
            case "blue": newColorVec3 = vec3(0, 0, 1); break;
            case "yellow": newColorVec3 = vec3(1, 1, 0); break;
            case "grey": newColorVec3 = vec3(0.5, 0.5 , 0.5); break;
            case "white": newColorVec3 = vec3(1, 1, 1); break;
            case "black": newColorVec3 = vec3(0,0,0); break;
            case "light_blue": newColorVec3 = vec3(55/255, 198/255, 1); break;
            case "brown": newColorVec3 = vec3(150/255,75/255,0); break;
            case "dark_green": newColorVec3 = vec3(0, 100/255, 0); break;
            case "sidewalk_grey": newColorVec3 = vec3(216/255, 214/255, 205/255); break;
            case "roof_tile": newColorVec3 = vec3(157/255, 96/255, 85/255); break;
            case "light_yellow": newColorVec3 = vec3(1, 1, 150/255); break;
            case "light_red": newColorVec3 = vec3(1, 204/255, 203/255); break;
            case "silver": newColorVec3 = vec3(170/255, 169/255, 173/255); break;
        }
        gl.uniform3fv(color, newColorVec3);
    }

    //HELICOPTER
    function propelorRotor(){
        multScale([2/3,2.5,2/3]);

        uploadModelView();
        updateComponentColor("yellow");
        CYLINDER.draw(gl, program, mode);
    }

    function propelorBlade(){
        multScale([16,1,1]);

        uploadModelView();
        updateComponentColor("red");
        SPHERE.draw(gl, program, mode);
    }

    // 3 propelor blades
    function propelor(){
        pushMatrix();
            propelorRotor();
        popMatrix();
        pushMatrix();
            multTranslation([0,1/2,0]);
            pushMatrix();
                multTranslation([8,0,0]);
                propelorBlade();
            popMatrix();
            pushMatrix();
                multRotationY(120);
                multTranslation([8,0,0]);
                propelorBlade();
            popMatrix();
            pushMatrix();
                multRotationY(240);
                multTranslation([8,0,0]);
                propelorBlade();
            popMatrix();
        popMatrix();
    }

    function cockpit() {
        multScale([20,10,10]);

        uploadModelView();
        updateComponentColor("blue");
        SPHERE.draw(gl, program, mode);
    }

    function tailBoom() { 
        multScale([20,3,2]);

        uploadModelView();
        updateComponentColor("blue");
        SPHERE.draw(gl, program, mode);
    }

    function tail() {
        multRotationZ(70);
        multScale([5,3,2]);

        uploadModelView();
        updateComponentColor("blue");
        SPHERE.draw(gl, program, mode);
    }

    function mainPart() {
        pushMatrix();
            multTranslation([-1,-6.5,0]);
            cockpit();
        popMatrix();
        pushMatrix();
            multTranslation([14,-5,0]);
            tailBoom();
        popMatrix();
        pushMatrix();
            multTranslation([23,-3.5,0]);
            tail();
        popMatrix();
    }

    function tailPropelorRotor(){
        multScale([2/3,1.5,2/3]);

        uploadModelView();
        updateComponentColor("yellow");
        CYLINDER.draw(gl, program, mode);
    }

    function tailPropelorBlade(){
        multScale([3.5,0.5,0.5]);

        uploadModelView();
        updateComponentColor("red");
        SPHERE.draw(gl, program, mode);
    }

    function tailPropelor(){
        pushMatrix();
            tailPropelorRotor();
        popMatrix();
        pushMatrix();
            multTranslation([0,1/2,0]);
            pushMatrix();
                multTranslation([1.5,0,0]);
                tailPropelorBlade();
            popMatrix();
            pushMatrix();
                multTranslation([-1.5,0,0]);
                tailPropelorBlade();
            popMatrix();
        popMatrix();
    }

    function helicopterLeg(){
        multScale([2/3,5,2/3]);

        uploadModelView();
        updateComponentColor("yellow");
        CUBE.draw(gl, program, mode);
    }

    function helicopterSupport(){
        multScale([1,20,1]);

        uploadModelView();
        updateComponentColor("silver");
        CYLINDER.draw(gl, program, mode);
    }

    function base() {
        pushMatrix();
            multTranslation([-5,-12,4]);
            multRotationX(-20);
            multRotationZ(-15);
            helicopterLeg();
        popMatrix();
        pushMatrix();
            multTranslation([3,-12,4]);
            multRotationX(-20);
            multRotationZ(15);
            helicopterLeg();
        popMatrix();
        pushMatrix();
            multTranslation([-5,-12,-4]);
            multRotationX(20);
            multRotationZ(-15);
            helicopterLeg();
        popMatrix();
        pushMatrix();
            multTranslation([3,-12,-4]);
            multRotationX(20);
            multRotationZ(15);
            helicopterLeg();
        popMatrix();
        pushMatrix();
            multTranslation([0,-14,4.8]);
            multRotationZ(90);
            helicopterSupport();
        popMatrix();
        pushMatrix();
            multTranslation([0,-14,-4.8]);
            multRotationZ(90);
            helicopterSupport();
        popMatrix();
    }

    function helicopter(){
        pushMatrix();
            pushMatrix();
                multTranslation([0,-0.5,0]);
                multRotationY(propelorRotation);
                propelor();
            popMatrix()
            pushMatrix();
                mainPart();
            popMatrix();
            pushMatrix();
                multTranslation([23,-3.5,1]);
                multRotationZ(propelorRotation);
                multRotationX(90);
                tailPropelor();
            popMatrix();
            pushMatrix();
                base();
            popMatrix();   
        popMatrix();
    }

    // BOX
    function box(){
        multScale([2, 2, 2]);

        uploadModelView();
        updateComponentColor("yellow");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl, program, gl.LINE_LOOP);
    }

    function hideBox(index) {
        boxValue[index] = false;
    }

    // CITY GROUND
    function ground(){
        multScale([CITY_WIDTH * 2, 0.5, CITY_WIDTH * 2]);

        uploadModelView();
        updateComponentColor("dark_green");
        CUBE.draw(gl, program, mode);
    }

    
    // CENTRAL BUILDING
    function buildingStructure(){
        multScale([20, BUILDING_HEIGHT, 20]);
        
        uploadModelView();
        updateComponentColor("grey");
        CUBE.draw(gl, program, mode);
        
        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);
    }

    function windowGlass(windowSize){
        multScale([10, windowSize, windowSize]);
        
        uploadModelView();
        updateComponentColor("light_blue");
        CUBE.draw(gl, program, mode);
        
        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);
    }

    function windowFrame(){
        multScale([0.5, 0.5, 5.5]);

        uploadModelView();
        updateComponentColor("white");
        CUBE.draw(gl, program, mode);
        
        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);
    }

    function buildingWindow(){
        pushMatrix();
            let windowSize = 5;
            windowGlass(windowSize);
        popMatrix();
        
        pushMatrix();
            multTranslation([5.1, 0, 0]);
            for(let i=0; i<2; i++){
                multRotationX(90 * i);
                for(let j=0; j<3; j++){
                    pushMatrix();
                        multTranslation([0, 2.5 - (j*5/2) , 0]);
                        windowFrame();
                    popMatrix();
                }
            }
        popMatrix();

    }

    function buildingDoor(){
        multScale([1, 5.5, 4]);

        uploadModelView();
        updateComponentColor("brown");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl, program, gl.LINES);
    }

    function middleBuilding(){
        pushMatrix();
            buildingStructure();
        popMatrix();

        pushMatrix();
            multTranslation([10, -16.5, 0]);
            buildingDoor();
        popMatrix();
    
        for (let j=0; j<4; j++){ // For each side of the building
            multRotationY(90 * j);
            for (let i=0; i<4; i++){
                pushMatrix();
                    multTranslation([5.1, 15 - (i*7), 3.5]);
                    buildingWindow();
                popMatrix();
                pushMatrix();
                    multTranslation([5.1, 15 - (i*7), -3.5]);
                    buildingWindow();
                popMatrix();
            }
        }  
    }


    // ROAD AND SIDEWALK
    function roadPavement(size){
        multScale([15, 0.2, size]);

        uploadModelView();
        updateComponentColor("black");
        CUBE.draw(gl, program, mode);
    }

    function roadMark(){
        multScale([1, 0.21, 5]);

        uploadModelView();
        updateComponentColor("white");
        CUBE.draw(gl, program, mode);

    }

    function road(size){
        pushMatrix();
            roadPavement(size);
        popMatrix();
        for(let i=0; i< Math.trunc(size/10) ; i++){
            pushMatrix();
                multTranslation([0, 0, (size/2 -5) - (i*10)]);
                roadMark();
            popMatrix();
        }
    }

    function sideWalkTile(){
        multScale([5, 0.2, 5]);

        uploadModelView();
        updateComponentColor("sidewalk_grey");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl, program, gl.LINES);
    }

    function mainSideWalk( buildingSide ){
        for(let i=0; i<SIDE_WALK_TILES; i++){
            if (i < 4 || i > 6 || !buildingSide){
                pushMatrix();
                    multTranslation([0, 0, -47.5 + (i*5)]);
                    sideWalkTile();
                popMatrix();
            }
        }
    }

    function secondarySideWalk(){
        for(let i=0; i<SIDE_WALK_TILES_SECONDARY; i++){
            pushMatrix();
                multTranslation([0, 0, -31.5 + (i*5)]);
                sideWalkTile();
            popMatrix();
        }
    }

    // SMALL HOUSE
    function houseStructure(houseColor){
        multScale([15, 12, 12]);
        
        uploadModelView();
        updateComponentColor(houseColor);
        CUBE.draw(gl, program, mode);
        
        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);
    }

    function houseRoofTile(size){
        multScale([size, 2, size]);
        
        uploadModelView();
        updateComponentColor("roof_tile");
        CUBE.draw(gl, program, mode)

        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);

    }

    function smallHouse(color){
        pushMatrix();
            houseStructure(color);
        popMatrix();
        for(let i=0; i<HOUSE_ROOF_TILES; i++){
            pushMatrix();
                multTranslation([0, 6 + 2*i, 0]);
                houseRoofTile(16 - (i*3));
            popMatrix();
        }
        pushMatrix();
            multRotationY(-90);
            multTranslation([6,-2.75,0]);
            buildingDoor();
        popMatrix();   
        pushMatrix();
            multRotationY(-90);
            multScale([0.75, 0.75, 0.75]);
            multTranslation([3.5, 1, 6.5]);
            buildingWindow();
        popMatrix();
        
        pushMatrix();
        multRotationY(-90);
        multScale([0.75, 0.75, 0.75]);
        multTranslation([3.5, 1, -6.5]);
        buildingWindow();
        popMatrix();
    }

    // HELIPORT
    function heliportFloor(){
        multScale([15, 0.1, 15]);

        uploadModelView();
        updateComponentColor("grey");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);

    }

    function heliportOutsideCircle(){
        multScale([13, 0.11, 13]);

        uploadModelView();
        updateComponentColor("white");
        CYLINDER.draw(gl, program, mode);

    }
    function heliportInsideCircle(){
        multScale([11, 0.12, 11]);

        uploadModelView();
        updateComponentColor("grey");
        CYLINDER.draw(gl, program, mode);

    }

    function heliportHSymbolPart(){
        multScale([6, 0.13, 1]);

        uploadModelView();
        updateComponentColor("white");
        CUBE.draw(gl, program, mode);

    }

    function heliport(){
        pushMatrix();
            heliportFloor();
        popMatrix();
        pushMatrix();
            heliportOutsideCircle();
        popMatrix();
        pushMatrix();
            heliportInsideCircle();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,-2.5]);
            heliportHSymbolPart();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,2.5]);
            heliportHSymbolPart();
        popMatrix();
        pushMatrix();
            multRotationY(90);
            heliportHSymbolPart();
        popMatrix();
    }

    // CHRISTMAS TREE
    function treeLog(){
        multScale([2, 8, 2]);
        
        uploadModelView();
        updateComponentColor("brown");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl,program, gl.LINES);
    }

    function treeBranches(){
        multScale([6,10,6]);

        uploadModelView();
        updateComponentColor("dark_green");
        PYRAMID.draw(gl, program, mode);

        updateComponentColor("black");
        PYRAMID.draw(gl,program, gl.LINES);
    }

    function treeDecoration(color){
        multScale([1, 1, 1]);

        uploadModelView();
        updateComponentColor(color);
        SPHERE.draw(gl, program, mode);
    }

    function christmasTree(){
        pushMatrix();
            treeLog();
        popMatrix();
        pushMatrix();
            multTranslation([0,6,0]);
            treeBranches();
        popMatrix();
        for(let i=0; i<4; i++){ // For each side of a tree, add the decorating balls
            multRotationY(90 * i);
            pushMatrix();
                multTranslation([1.5,7,0]);
                treeDecoration("red");
            popMatrix();
            pushMatrix();
                multTranslation([2,5,1]);
                treeDecoration("yellow");
            popMatrix();
            pushMatrix();
                multTranslation([2,5,-1]);
                treeDecoration("red");
            popMatrix();
            pushMatrix();
                multTranslation([2.5, 3, 1.5]);
                treeDecoration("red");
            popMatrix();
            pushMatrix();
                multTranslation([2.5, 3, -1.5]);
                treeDecoration("yellow");
            popMatrix();
        }
    }


    // STREETS
    function mainStreet(){
        pushMatrix();
            let pavementSize = 100;
            road(pavementSize);
        popMatrix();
        pushMatrix();
            multTranslation([-10, 0, 0]);
            let buildingSide = true;
            mainSideWalk(buildingSide);
        popMatrix();
        pushMatrix();
            multTranslation([10, 0, 0]);
            buildingSide = false;
            mainSideWalk(buildingSide);
        popMatrix();
    }

    function secondaryStreet(){
        pushMatrix();
            let pavementSize = 65;
            road(pavementSize);
        popMatrix();
        pushMatrix();
            multTranslation([10, 0, 1.5]);
            secondarySideWalk();
        popMatrix();
        pushMatrix();
            multTranslation([-10, 0, 1.5]);
            secondarySideWalk();
        popMatrix();
    }

    function neighbourhood(){
        pushMatrix();
            multTranslation([22.5,0.2,0]);
            mainStreet();
        popMatrix();
        pushMatrix();
            multRotationY(90);
            multTranslation([22.5, 0.2, -17.5]);
            secondaryStreet();
        popMatrix();
        pushMatrix();
            multTranslation([-20, 6, -42.5]);
            smallHouse("light_yellow");
        popMatrix();
        pushMatrix();
            multTranslation([-40, 6, -42.5]);
            smallHouse("light_red");
        popMatrix();
        for (let i=0; i<CHRISTMAS_TREES; i++){
            pushMatrix();
                multTranslation([42.5 , 4, 40 - i*12]);
                christmasTree();
            popMatrix();
        }
    }

    function updatePoint() { // Updates the variable that stores the exact position of the helicopter
        mModel = mult(inverse(mView), modelView());
        point = mult(mModel, vec4(0,0,0,1));
    }

    function updateHeight() { // Updates the height of the helicopter
        switch(heightChange) {
            case 1:
                if (height + HEIGHT_CHANGE <= MAX_HEIGHT)
                    height += HEIGHT_CHANGE;
                else height = MAX_HEIGHT;
                break;
            case -1:
                if (movement) {
                    if (height - HEIGHT_CHANGE >= MIN_MOVEMENT_HEIGHT)
                        height -= HEIGHT_CHANGE;
                    else
                        height = MIN_MOVEMENT_HEIGHT;
                }
                else {
                    if (height - HEIGHT_CHANGE >= MIN_HEIGHT)
                        height -= HEIGHT_CHANGE;
                    else
                        height = MIN_HEIGHT;
                }
                break;
        }
    }

    function boxes() { // Deals with the boxes' placement and movement
        for (let i = 0; i < maxBoxes; i++) {
            pushMatrix();
            if (boxValue[i]) {
                multTranslation([boxPoint[i][0], boxPoint[i][1], boxPoint[i][2]]);
                multRotationY(boxAngle[i]);
                multTranslation([0,0,-boxPositionZ[i]]);
                        if (boxPoint[i][1] > MIN_BOX_HEIGHT) {
                            boxSpeedY[i] = boxSpeedY[i]*GRAVITATIONAL_ACCELERATION;
                            boxSpeedZ[i] = boxSpeedZ[i]*AIR_FRICTION;
                            boxPositionZ[i] += boxSpeedZ[i];
                            boxPoint[i][1] -= boxSpeedY[i];
                            if (boxPoint[i][1] < MIN_BOX_HEIGHT) boxPoint[i][1] = MIN_BOX_HEIGHT;
                        }
                box();
            }
            popMatrix();
        }
    }

    function move() { // Causes the helicopter to move
        if (movement) {
            if (currentSpeed < MAX_SPEED) currentSpeed += SPEED_CHANGE;
            if (currentSpeed > MAX_SPEED) currentSpeed = MAX_SPEED;
            if (height < MIN_MOVEMENT_HEIGHT) height += MIN_HEIGHT;
        }
        else {
            if (currentSpeed > 0) currentSpeed -= SPEED_CHANGE;
            if (currentSpeed < 0) currentSpeed = 0;
        }
    }

    function firstPersonView() { // Helicopter camera
        fpvAt = mult(mModel, vec4(0,0,1,1));
        mView = lookAt([point[0],point[1],point[2]], [fpvAt[0],fpvAt[1],fpvAt[2]], [0,1,0]);
        mView = mult(scalem(4,4,4), mult(rotateY(90), mult(rotateZ(currentSpeed*INCLINE_MULTIPLIER), mView)));
    }

    function render() { 

        helicopterAngle += currentSpeed;
        window.requestAnimationFrame(render);

        gl.clearColor(135/255, 206/255, 235/255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        if (axonometric)
            mView = mult(lookAt([0,0,CITY_WIDTH], [0,0,0], [0,1,0]), mult(rotateX(angleGamma), rotateY(angleTheta)));

        if (fpv)
            firstPersonView();

        if (heightChange != 0) updateHeight();
        if (height <= MIN_HEIGHT) propelorRotationSpeed = 0;
        else propelorRotationSpeed = BASE_PROPELOR_SPEED + heightChange*PROPELOR_SPEED_FACTOR;
        propelorRotation += propelorRotationSpeed;

        loadMatrix(mView);

        pushMatrix();
            multRotationY(helicopterAngle);         
            multTranslation([30, height + 6.2, 0]); // 6.2 so that the helicopter base is slightly above the ground when height = 0
            multRotationY(-90);      // Makes the helicopter face forward rather than the center building
            move();
            multRotationZ(currentSpeed * INCLINE_MULTIPLIER);    // Helicopter tilts as it gains speed
            updatePoint(); // Updates the variable that stores the exact position of the helicopter
            multScale([0.4,0.4,0.4]);
            helicopter();
        popMatrix();
        boxes();
        pushMatrix();
            ground();
        popMatrix();
        pushMatrix();
            multTranslation([0, BUILDING_HEIGHT/2, 0]);
            middleBuilding();
        popMatrix();
        pushMatrix();
            neighbourhood();
        popMatrix();
        pushMatrix();
            multTranslation([0, 0.25, 30]);
            heliport();
        popMatrix();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))