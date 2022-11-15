import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

const PLANET_SCALE = 10;    // scale that will apply to each planet and satellite
const ORBIT_SCALE = 1/60;   // scale that will apply to each orbit around the sun

const SUN_DIAMETER = 1391900;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous

const MERCURY_DIAMETER = 4866*PLANET_SCALE;
const MERCURY_ORBIT = 57950000*ORBIT_SCALE;
const MERCURY_YEAR = 87.97;
const MERCURY_DAY = 58.646;

const VENUS_DIAMETER = 12106*PLANET_SCALE;
const VENUS_ORBIT = 108110000*ORBIT_SCALE;
const VENUS_YEAR = 224.70;
const VENUS_DAY = 243.018;

const EARTH_DIAMETER = 12742*PLANET_SCALE;
const EARTH_ORBIT = 149570000*ORBIT_SCALE;
const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

const MOON_DIAMETER = 3474*PLANET_SCALE;
const MOON_ORBIT = 363396;
const MOON_YEAR = 28;
const MOON_DAY = 0;

const VP_DISTANCE = EARTH_ORBIT;

//NOVAS CONSTANTES
const CITY_WIDTH = 50;



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-CITY_WIDTH*aspect,CITY_WIDTH*aspect, -CITY_WIDTH, CITY_WIDTH,-3*CITY_WIDTH,3*CITY_WIDTH);

    mode = gl.LINES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
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
                if(animation) speed *= 1.1;
                break;
            case '-':
                if(animation) speed /= 1.1;
                break;
        }
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
    CYLINDER.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


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

/*
    function Sun()
    {
        // Don't forget to scale the sun, rotate it around the y axis at the correct speed
        multScale([SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(360*time/SUN_DAY);

        // Send the current modelview matrix to the vertex shader
        uploadModelView();

        // Draw a sphere representing the sun
        SPHERE.draw(gl, program, mode);
    }

    function Mercury(){
        multScale([MERCURY_DIAMETER, MERCURY_DIAMETER, MERCURY_DIAMETER]);
        multRotationY(360*time/MERCURY_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Venus(){
        multScale([VENUS_DIAMETER, VENUS_DIAMETER, VENUS_DIAMETER]);
        multRotationY(360*time/VENUS_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Earth(){
        multScale([EARTH_DIAMETER, EARTH_DIAMETER, EARTH_DIAMETER]);
        multRotationY(360*time/EARTH_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Moon(){
        multScale([MOON_DIAMETER, MOON_DIAMETER, MOON_DIAMETER]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function EarthAndMoon(){
        pushMatrix();
            Earth();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MOON_YEAR);
            multTranslation([MOON_ORBIT, 0, 0]);
            Moon();
        popMatrix();
    }
    */

    /*function SolarSystem(){
        pushMatrix();
            Sun();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MERCURY_YEAR);
            multTranslation([MERCURY_ORBIT, 0, 0]);
            Mercury();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/VENUS_YEAR);
            multTranslation([VENUS_ORBIT, 0, 0]);
            Venus();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/EARTH_YEAR);
            multTranslation([EARTH_ORBIT, 0, 0]);
            EarthAndMoon();
        popMatrix();
    }*/

    function RotorDeHelice(){
        multScale([2/3,2.5,2/3]);

        uploadModelView();
        CYLINDER.draw(gl, program, mode);
    }

    function PaDeHelice(){
        multScale([16,1,1]);

        uploadModelView();
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
        SPHERE.draw(gl, program, mode);
    }

    function carenagem() { // estrutura entre a cabeça e cauda do helicóptero; não tenho a certeza se é assim que se chama
        multScale([20,3,2]);

        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function cauda() {
        multRotationZ(70);
        multScale([5,3,2]);

        uploadModelView();
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
        CYLINDER.draw(gl, program, mode);
    }

    function PaDaCauda(){
        multScale([3.5,0.5,0.5]);

        uploadModelView();
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
        CUBE.draw(gl, program, mode);
    }

    function apoio(){
        multScale([1,20,1]);

        uploadModelView();
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

    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(lookAt([0,CITY_WIDTH/2,CITY_WIDTH], [0,0,0], [0,1,0])); // vista meio de cima
        //loadMatrix(lookAt([0,0,CITY_WIDTH], [0,0,0], [0,1,0])); // vista de lado
        //loadMatrix(lookAt([CITY_WIDTH,0,0], [0,0,0], [0,1,0])); // vista de frente

        //SolarSystem();


        multRotationY(time/4); // helicóptero a rodar para ajudar a perceber as dimensões
        pushMatrix();
            multScale([2,2,2]); // só para ver melhor o helicóptero
            pushMatrix();
                multTranslation([0,-0.5,0]);
                multRotationY(time);
                Helice();
            popMatrix()
            pushMatrix();
                partePrincipal();
            popMatrix();
            pushMatrix();
                multTranslation([23,-3.5,1]);
                multRotationZ(time);
                multRotationX(90);
                HeliceDaCauda();
            popMatrix();
            pushMatrix();
                base();
            popMatrix();
        popMatrix();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
