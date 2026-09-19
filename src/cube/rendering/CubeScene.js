/**
 * CubeStudio V2 - CubeScene
 * Sets up and manages Three.js Scene, Camera, Lighting, Orbit Interaction, and Render Loop.
 */

import * as THREE from 'three';

export class CubeScene {
  /**
   * @param {object} [options]
   * @param {HTMLElement} [options.container]
   */
  constructor(options = {}) {
    this.container = options.container || null;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.defaultCameraPos = new THREE.Vector3(4.8, 3.8, 5.8);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting
    this._setupLighting();

    // 5. Orbit control state
    this._isDragging = false;
    this._previousMousePosition = { x: 0, y: 0 };
    this._spherical = new THREE.Spherical().setFromVector3(this.camera.position);
    this._targetSpherical = new THREE.Spherical().setFromVector3(this.camera.position);

    // Bind event handlers
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onResize = this._onResize.bind(this);
    this._renderLoop = this._renderLoop.bind(this);

    this._animationFrameId = null;

    if (this.container) {
      this.mount(this.container);
    }
  }

  _setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Key directional light (front-top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light (back-left)
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.0);
    fillLight.position.set(-8, -4, -6);
    this.scene.add(fillLight);

    // Subtle rim light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-6, 8, -6);
    this.scene.add(rimLight);
  }

  /**
   * Mounts the WebGL canvas into a DOM container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.container = container;
    this.container.appendChild(this.renderer.domElement);

    // Attach listeners
    this.container.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.container.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('resize', this._onResize);

    this.resize();
    this.start();
  }

  /**
   * Adds an object (e.g. the cube group) to the scene.
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object);
  }

  /**
   * Removes an object from the scene.
   * @param {THREE.Object3D} object
   */
  remove(object) {
    this.scene.remove(object);
  }

  resize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  resetCamera() {
    this._targetSpherical.setFromVector3(this.defaultCameraPos);
  }

  _onPointerDown(e) {
    // Only primary button
    if (e.button !== 0) return;
    this._isDragging = true;
    this._previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  _onPointerMove(e) {
    if (!this._isDragging) return;
    const deltaX = e.clientX - this._previousMousePosition.x;
    const deltaY = e.clientY - this._previousMousePosition.y;

    const rotationSpeed = 0.005;
    this._targetSpherical.theta -= deltaX * rotationSpeed;
    this._targetSpherical.phi -= deltaY * rotationSpeed;

    // Constrain phi to avoid flipping camera over the poles
    const minPhi = 0.1;
    const maxPhi = Math.PI - 0.1;
    this._targetSpherical.phi = Math.max(minPhi, Math.min(maxPhi, this._targetSpherical.phi));

    this._previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  _onPointerUp() {
    this._isDragging = false;
  }

  _onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.002;
    this._targetSpherical.radius += e.deltaY * zoomSpeed;
    // Constrain distance
    this._targetSpherical.radius = Math.max(4.0, Math.min(12.0, this._targetSpherical.radius));
  }

  _onResize() {
    this.resize();
  }

  _renderLoop() {
    // Smooth damping for camera orbit
    const damping = 0.1;
    this._spherical.theta += (this._targetSpherical.theta - this._spherical.theta) * damping;
    this._spherical.phi += (this._targetSpherical.phi - this._spherical.phi) * damping;
    this._spherical.radius += (this._targetSpherical.radius - this._spherical.radius) * damping;

    this.camera.position.setFromSpherical(this._spherical);
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    this._animationFrameId = requestAnimationFrame(this._renderLoop);
  }

  start() {
    if (!this._animationFrameId) {
      this._renderLoop();
    }
  }

  stop() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  dispose() {
    this.stop();
    if (this.container) {
      this.container.removeEventListener('pointerdown', this._onPointerDown);
      this.container.removeEventListener('wheel', this._onWheel);
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);

    this.renderer.dispose();
  }
}
