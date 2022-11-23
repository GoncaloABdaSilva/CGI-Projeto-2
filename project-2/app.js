import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, mult, rotateX, rotateY, translate, scalem } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as PYRAMID from '../../libs/objects/pyramid.js';
/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time
let speed = 1;     // Speed 
let currentSpeed = 0;
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running
let height = 0;
let boxHeight = [];
let boxValue = [];
let boxIndex = 0;
let boxTime = [];
let boxPosition = [];
let mView;
let angleX = 0;
let angleY = 0;
let axonometric = true;
let fpv = false;
let movement = false;
let helicopterAngle = 0;
let maxBoxes = 1;
let input = false;

const CITY_WIDTH = 50;
const MAX_SPEED = 3;
const MIN_SPEED = 0;
const INCLINE_MULTIPLIER = 10;    //So that the maximum incline the helicopter can have is 30 degrees
const MAX_HEIGHT = 35;
const MIN_HEIGHT = 0;

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-CITY_WIDTH*aspect,CITY_WIDTH*aspect, -CITY_WIDTH, CITY_WIDTH,-3*CITY_WIDTH,3*CITY_WIDTH);

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
                    mView = lookAt([0,0,1], [0,0,0], [0,1,0]);
                    break;
                case '3':
                    // Top view
                    axonometric = false;
                    fpv = false;
                    mView = lookAt([0,1,0],  [0,0,0], [0,0,-1]);
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
                case 'p':
                    animation = !animation;
                    break;
                case '+':
                    if(animation && speed + 0.2 <= MAX_SPEED) speed += 0.2;
                    break;
                case '-':
                    if(animation && speed - 0.2 >= MIN_SPEED) speed -= 0.2;
                    break;
                case "ArrowUp":
                    if(animation && height + 0.2 <= MAX_HEIGHT) height += 0.2;
                    break;
                case "ArrowDown":
                    if(animation && height - 0.2 >= MIN_HEIGHT) height -= 0.2;
                    break;
                case "ArrowLeft":
                    movement = true;
                    break;
                case " ":
                    if (height >= 4) {
                        updateIndex();
                        if(!boxValue[boxIndex]) {
                            boxTime[boxIndex] = 0.1;
                            boxHeight[boxIndex] = height;
                            boxValue[boxIndex] = true;
                            boxPosition[boxIndex] = helicopterAngle;
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
        if (event.key == "ArrowLeft") {
            movement = false;
        }
    }

    // TESTE //

    const textInputs = document.getElementsByClassName("textInputs");
    for(let i = 0; i < textInputs.length; i++) {
        textInputs[i].addEventListener("click", function() {
            input = true;
            console.log(input);
        })

        textInputs[i].addEventListener("change", function() {
            input = false;
            console.log(input);
        })

    }

    document.querySelector("canvas").addEventListener("click", function() {
        input = false;
        console.log(input);
    })

    document.getElementById("textInputX").addEventListener("input", function() {
        document.getElementById("sliderX").value = this.value;
        angleX = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("sliderX").addEventListener("input", function() {
        document.getElementById("textInputX").value = this.value;
        angleX = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("textInputY").addEventListener("input", function() {
        document.getElementById("sliderY").value = this.value;
        angleY = this.value;
        fpv = false;
        axonometric = true;
    })

    document.getElementById("sliderY").addEventListener("input", function() {
        document.getElementById("textInputY").value = this.value;
        angleY = this.value;
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

    

    // TESTE //

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
        mProjection = ortho(-CITY_WIDTH*aspect,CITY_WIDTH*aspect, -CITY_WIDTH, CITY_WIDTH,-3*CITY_WIDTH,3*CITY_WIDTH);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function updateComponentColor(newColor){
        const color = gl.getUniformLocation(program, "color");
        switch(newColor){
            case "red": gl.uniform3fv(color, vec3(1,0,0)); break;
            case "blue": gl.uniform3fv(color, vec3(0, 0, 1)); break;
            case "yellow": gl.uniform3fv(color, vec3(1, 1, 0)); break;
            case "grey": gl.uniform3fv(color, vec3(0.5, 0.5 , 0.5)); break;
            case "white": gl.uniform3fv(color, vec3(1, 1, 1)); break;
            case "black": gl.uniform3fv(color, vec3(0,0,0)); break;
            case "light_blue": gl.uniform3fv(color, vec3(55/255, 198/255, 1)); break;
            case "brown": gl.uniform3fv(color, vec3(150/255,75/255,0)); break;
            case "dark_green": gl.uniform3fv(color, vec3(0, 100/255, 0)); break;
            case "sidewalk_grey": gl.uniform3fv(color, vec3(216/255, 214/255, 205/255)); break;
            case "roof_tile": gl.uniform3fv(color, vec3(157/255, 96/255, 85/255)); break;
            case "light_yellow": gl.uniform3fv(color, vec3(1, 1, 102/255)); break;
            case "light_red": gl.uniform3fv(color, vec3(1, 204/255, 203/255)); break;
        }
    }

    //HELICOPTERO

    function RotorDeHelice(){
        multScale([2/3,2.5,2/3]);

        uploadModelView();
        updateComponentColor("yellow");
        CYLINDER.draw(gl, program, mode);
    }

    function PaDeHelice(){
        multScale([16,1,1]);

        uploadModelView();
        updateComponentColor("blue");
        SPHERE.draw(gl, program, mode);
    }

    // 3 helices
    function Helice(){
        pushMatrix();
            RotorDeHelice();
        popMatrix();
        pushMatrix();
            multTranslation([0,1/2,0]);
            pushMatrix();
                multTranslation([8,0,0]);
                PaDeHelice();
            popMatrix();
            pushMatrix();
                multRotationY(120);
                multTranslation([8,0,0]);
                PaDeHelice();
            popMatrix();
            pushMatrix();
                multRotationY(240);
                multTranslation([8,0,0]);
                PaDeHelice();
            popMatrix();
        popMatrix();
    }

    function frente() {
        multScale([20,10,10]);

        uploadModelView();
        updateComponentColor("red");
        SPHERE.draw(gl, program, mode);
    }

    function carenagem() { // estrutura entre a cabeça e cauda do helicóptero; não tenho a certeza se é assim que se chama
        multScale([20,3,2]);

        uploadModelView();
        updateComponentColor("red");
        SPHERE.draw(gl, program, mode);
    }

    function cauda() {
        multRotationZ(70);
        multScale([5,3,2]);

        uploadModelView();
        updateComponentColor("red");
        SPHERE.draw(gl, program, mode);
    }

    function partePrincipal() {
        pushMatrix();
            multTranslation([-1,-6.5,0]);
            frente();
        popMatrix();
        pushMatrix();
            multTranslation([14,-5,0]);
            carenagem();
        popMatrix();
        pushMatrix();
            multTranslation([23,-3.5,0]);
            cauda();
        popMatrix();
    }

    function RotorDaCauda(){
        multScale([2/3,1.5,2/3]);

        uploadModelView();
        updateComponentColor("yellow");
        CYLINDER.draw(gl, program, mode);
    }

    function PaDaCauda(){
        multScale([3.5,0.5,0.5]);

        uploadModelView();
        updateComponentColor("blue");
        SPHERE.draw(gl, program, mode);
    }

    function HeliceDaCauda(){
        pushMatrix();
            RotorDaCauda();
        popMatrix();
        pushMatrix();
            multTranslation([0,1/2,0]);
            pushMatrix();
                multTranslation([1.5,0,0]);
                PaDaCauda();
            popMatrix();
            pushMatrix();
                multTranslation([-1.5,0,0]);
                PaDaCauda();
            popMatrix();
        popMatrix();
    }

    function perna(){
        multScale([2/3,5,2/3]);

        uploadModelView();
        updateComponentColor("grey");
        CUBE.draw(gl, program, mode);
    }

    function apoio(){
        multScale([1,20,1]);

        uploadModelView();
        updateComponentColor("yellow");
        CYLINDER.draw(gl, program, mode);
    }

    function base() {
        pushMatrix();
            multTranslation([-5,-12,4]);
            multRotationX(-20);
            multRotationZ(-15);
            perna();
        popMatrix();
        pushMatrix();
            multTranslation([3,-12,4]);
            multRotationX(-20);
            multRotationZ(15);
            perna();
        popMatrix();
        pushMatrix();
            multTranslation([-5,-12,-4]);
            multRotationX(20);
            multRotationZ(-15);
            perna();
        popMatrix();
        pushMatrix();
            multTranslation([3,-12,-4]);
            multRotationX(20);
            multRotationZ(15);
            perna();
        popMatrix();
        pushMatrix();
            multTranslation([0,-14,4.8]);
            multRotationZ(90);
            apoio();
        popMatrix();
        pushMatrix();
            multTranslation([0,-14,-4.8]);
            multRotationZ(90);
            apoio();
        popMatrix();
    }

    function helicoptero(){
        pushMatrix();
            pushMatrix();
                multTranslation([0,-0.5,0]);
                multRotationY(time*12);
                Helice();
            popMatrix()
            pushMatrix();
                partePrincipal();
            popMatrix();
            pushMatrix();
                multTranslation([23,-3.5,1]);
                multRotationZ(time*12);
                multRotationX(90);
                HeliceDaCauda();
            popMatrix();
            pushMatrix();
                base();
            popMatrix();   
        popMatrix();
    }

    //CAIXA
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

    //CIDADE
    function soil(){
        multScale([CITY_WIDTH * 2, 0.5, CITY_WIDTH * 2]);

        uploadModelView();
        updateComponentColor("dark_green");
        CUBE.draw(gl, program, mode);
    }

    
    //EDIFICIO CENTRAL
    function buildingStructure(){
        multScale([20, 40, 20]);
        
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
    
        for (let j=0; j<4; j++){
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


    //ESTRADA E PASSEIO
    function roadPavement(size){
        multScale([15, 0.3, size]);

        uploadModelView();
        updateComponentColor("black");
        CUBE.draw(gl, program, mode);
    }

    function roadMark(){
        multScale([1, 0.4, 5]);

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
        multScale([5, 0.3, 5]);

        uploadModelView();
        updateComponentColor("sidewalk_grey");
        CUBE.draw(gl, program, mode);

        updateComponentColor("black");
        CUBE.draw(gl, program, gl.LINES);
    }

    function mainSideWalk( buildingSide ){
        for(let i=0; i<20; i++){
            if (i < 4 || i > 6 || !buildingSide){
                pushMatrix();
                    multTranslation([0, 0, -47.5 + (i*5)]);
                    sideWalkTile();
                popMatrix();
            }
        }
    }

    function secondarySideWalk(){
        for(let i=0; i<12; i++){
            pushMatrix();
                multTranslation([0, 0, -31.5 + (i*5)]);
                sideWalkTile();
            popMatrix();
        }
    }

    // VIVENDAS
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
        for(let i=0; i<4; i++){
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

    // ARVORES DE NATAL
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
        for(let i=0; i<4; i++){
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


// RUAS
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
            multTranslation([0, 6, -42.5]);
            smallHouse("white");
        popMatrix();
        pushMatrix();
            multTranslation([-20, 6, -42.5]);
            smallHouse("light_yellow");
        popMatrix();
        pushMatrix();
            multTranslation([-40, 6, -42.5]);
            smallHouse("light_red");
        popMatrix();
        for (let i=0; i<8; i++){
            pushMatrix();
                multTranslation([40 , 4, 40 - i*12]);
                christmasTree();
            popMatrix();
        }
    }

    function render()
    {
        if(animation) time += speed;
        helicopterAngle += currentSpeed;
        window.requestAnimationFrame(render);

        gl.clearColor(135/255, 206/255, 235/255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        if (axonometric) {
            mView = mult(lookAt([0,0,CITY_WIDTH], [0,0,0], [0,1,0]), mult(rotateX(angleX), rotateY(angleY)));
        }
        // TENTATIVAS DE FPV
        //mView = mult(lookAt([0,0,0], [0,0,0], [0,1,0]), mult(translate(-30, -height, 0), rotateY(-helicopterAngle))); // tentativa mais próxima de 1a pessoa
        //mView = mult(translate(-30, -height, 0), mult(rotateY(-helicopterAngle), lookAt([0,0,0], [0,0,0], [0,1,0])));
        //mView = mult(rotateY(-helicopterAngle), mult(translate(-30, -height - 4, 0), mult(scalem(4,4,4), rotateY(0))));
        //mView = mult(translate(0,0,0), mult(scalem(40,40,40), mult(translate(-30, -height-2, 0), rotateY(-helicopterAngle))));
        else if (fpv) {
            mView = mult(scalem(40,40,40), mult(translate(-30, -height-2, 0), rotateY(-helicopterAngle))); // ORIGINAL
            //mView = mult(scalem(32,32,32), mult(translate(-30, -height-2, 0), rotateY(-helicopterAngle)));
            //let v = mult(rotateY(-helicopterAngle), mult(translate(30, -height-2, 0), scalem(2,2,2)));
            //let tmp = vec4(0,0,0,1);
            //let eye = mult(v, tmp);
            //mView = lookAt([eye[0], eye[1], eye[2]], [0,0,0], [0,1,0]);
        }

        //maxBoxes = document.getElementById("sliderBoxes").value;
        //document.getElementById("maxNumOfBoxes").innerHTML = maxBoxes;

        loadMatrix(mView);

        pushMatrix();
                multRotationY(helicopterAngle);
            for (let i = 0; i < maxBoxes; i++) {
                if (boxValue[i]) { // se houver um slot de caixa livre
                    pushMatrix();
                        multRotationY(boxPosition[i] - helicopterAngle); // para não seguir o helicóptero
                        // multTranslation([30, boxHeight-boxTime, 0]); // descomentar
                        multTranslation([30,boxHeight[i],0]); // teste
                        // if(boxHeight-boxTime > 2) { // descomentar
                        if (boxHeight[i] > 1.75) {
                            boxTime[i] = boxTime[i]*1.1;
                            boxHeight[i] -= boxTime[i];
                            if (boxHeight[i] < 1.75) boxHeight[i] = 1.75;
                        }
                        console.log("Box" + i + "height = " + boxHeight[i]); // debug
                        box();
                    popMatrix();
                }
            }
            multTranslation([30, height + 6, 0]); // 6 para que as bases do helicoptero toquem no chao quando a altura é y=0
            //multScale([0.25, 0.25, 0.25]); ESCALA ORIGINAL
            multScale([0.4,0.4,0.4]);
            multRotationY(-90);      // para que o helicoptero fique a olhar para a frente e nao para o centro
            if (movement) {
                if (currentSpeed < speed) currentSpeed+=0.05;
                if (currentSpeed > speed) currentSpeed = speed;
            }
            else {
                if (currentSpeed > 0) currentSpeed-=0.05;
                if (currentSpeed < 0) currentSpeed = 0;
            }
            multRotationZ(currentSpeed * INCLINE_MULTIPLIER);    // helicoptero inclina consoante a velocidade
            helicoptero();
        popMatrix();
        pushMatrix();
            soil();
        popMatrix();
        pushMatrix();
            multTranslation([0, 20, 0]);
            middleBuilding();
        popMatrix();
        pushMatrix();
            neighbourhood();
        popMatrix();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))