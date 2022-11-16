import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3 } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";

import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time
let speed = 1;     // Speed 
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running
let height = 0;

const CITY_WIDTH = 50;
const MAX_SPEED = 3;
const MIN_SPEED = 0;
const INCLINE_MULTIPLIER = 10;    //So that the maximum incline the helicopter can have is 30 degrees
const MAX_HEIGHT = 25;
const MIN_HEIGHT = 0;


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
                if(animation && speed + 0.1 <= MAX_SPEED) speed += 0.1;
                break;
            case '-':
                if(animation && speed - 0.1 >= MIN_SPEED) speed -= 0.1;
                break;
            case "ArrowUp":
                if(animation && height + 0.1 <= MAX_HEIGHT) height += 0.1;
                break;
            case "ArrowDown":
                if(animation && height - 0.1 >= MIN_HEIGHT) height -= 0.1;
                
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

    function updateComponentColor(newColor){
        const color = gl.getUniformLocation(program, "color");
        switch(newColor){
            case "red": gl.uniform3fv(color, vec3(255,0,0)); break;
            case "blue": gl.uniform3fv(color, vec3(0, 0, 255)); break;
            case "yellow": gl.uniform3fv(color, vec3(255, 255, 0)); break;
            case "grey": gl.uniform3fv(color, vec3(128, 128, 128)); break;
        }
    }

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

    function soil(){
        multScale([CITY_WIDTH * 2, 0.5, CITY_WIDTH * 2]);

        uploadModelView();
        updateComponentColor("grey");2
        CUBE.draw(gl, program, mode);
    }

    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        //loadMatrix(lookAt([0,CITY_WIDTH/2,CITY_WIDTH], [0,0,0], [0,1,0])); // vista meio de cima
        //loadMatrix(lookAt([0,0,CITY_WIDTH], [0,0,0], [0,1,0])); // vista lateral
        //loadMatrix(lookAt([CITY_WIDTH,0,0], [0,0,0], [0,1,0])); // vista frontal
        loadMatrix(lookAt([CITY_WIDTH,CITY_WIDTH*3/4,CITY_WIDTH], [0,0,0], [0,1,0]));

        //Desenhar um circulo no centro
        multScale([50, 50, 50]);
        uploadModelView();
        SPHERE.draw(gl, program, mode);
        multScale([0.02,0.02,0.02]);
        //

        pushMatrix();
            multRotationY(time);
            multTranslation([40, height + 3.4, 0]); // 3.4 para que as bases do helicoptero toquem no chao quando a altura é 0
            multScale([0.2, 0.2, 0.2]);
            multRotationY(-90);      // para que o helicoptero fique a olhar para a frente e nao para o centro
            multRotationZ(speed * INCLINE_MULTIPLIER);    // helicoptero inclina consoante a velocidade
            helicoptero();
        popMatrix();
        pushMatrix();
            soil();
        popMatrix();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
