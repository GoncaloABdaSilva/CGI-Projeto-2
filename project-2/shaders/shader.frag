precision highp float;

varying vec3 fNormal;

void main() {
    gl_FragColor = vec4(abs(fNormal), 1.0);
}
