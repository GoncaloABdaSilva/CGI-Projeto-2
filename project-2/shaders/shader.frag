precision highp float;

varying vec3 fNormal;
varying vec3 componentColor;

void main() {
    //gl_FragColor = vec4(abs(fNormal), 1.0);
    gl_FragColor = vec4(componentColor, 1.0);
}
