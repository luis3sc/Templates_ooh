let scene, camera, renderer, cube, controls;
let composer, brightnessContrastPass, saturationPass;
// variables para las posiciones de las cámaras
let camara1Obj, camara2Obj, camara3Obj;


const objetosEditables = {
  //'Frontal': null,
  'Posterior': null,
  'Posterior_placa': null,
  'Faldon_derecho': null,
  'Faldon_izquierdo': null,
  'Lateral_derecho': null,
  'Lateral_izquierdo': null,
  'Logo_frontal': null,
  'Logo_derecho': null,
  'Logo_frontal_carro' : null,
  'Logo_izquierdo': null
};

init();
generateUI();

function init() {
  // Crear escena y cámara
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    (window.innerWidth * 0.7) / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(2, 2, 3);
  camera.lookAt(0, 0, 0);

  // Configurar renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // Fondo transparente
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5; // Mayor exposición = más contraste
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Postprocesado
const renderPass = new THREE.RenderPass(scene, camera);

// Brillo y contraste
brightnessContrastPass = new THREE.ShaderPass(THREE.BrightnessContrastShader);
brightnessContrastPass.uniforms['brightness'].value = 0.2; // entre -1 y 1
brightnessContrastPass.uniforms['contrast'].value = 0.3;   // entre -1 y 1

// Saturación personalizada
saturationPass = new THREE.ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 1.5 } // 1 = normal, 0 = gris, mayor = más saturado
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 saturated = mix(vec3(gray), color.rgb, amount);
      gl_FragColor = vec4(saturated, color.a);
    }
  `
});

composer = new THREE.EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(brightnessContrastPass);
composer.addPass(saturationPass);

  document.getElementById('container').appendChild(renderer.domElement);

  // Controles
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;

  // LUZ AMBIENTAL SUAVE
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  // LUZ DIRECCIONAL QUE PROYECTA SOMBRAS
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  // LUZ DE CIELO
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  // ENTORNO NEUTRO REFLECTANTE (para materiales metálicos)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const neutralScene = new THREE.Scene();
  neutralScene.background = new THREE.Color(0x999999); // Gris claro neutro
  const envMap = pmremGenerator.fromScene(neutralScene).texture;
  scene.environment = envMap;

  // CARGAR MODELO GLB
  const loader = new THREE.GLTFLoader();
  loader.load(
    'vallamovilTRA.glb',
    function (gltf) {
      cube = gltf.scene;
      cube.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Mejora de materiales metálicos
          if (child.material && child.material.isMeshStandardMaterial) {
            child.material.envMapIntensity = 1.5;
            child.material.metalness = Math.max(0.3, child.material.metalness || 0.0);
            child.material.roughness = Math.min(0.6, child.material.roughness || 1.0);
            child.material.needsUpdate = true;
          }

          if (objetosEditables.hasOwnProperty(child.name)) {
            child.material = child.material.clone();
            objetosEditables[child.name] = child;
          }
        }

        if (child.isCamera) {
          if (child.name === 'camara1') camara1Obj = child;
          else if (child.name === 'camara2') camara2Obj = child;
          else if (child.name === 'camara3') camara3Obj = child;
        }
      });

      scene.add(cube);
    },
    undefined,
    function (error) {
      console.error('Error al cargar vallamovilTRA.glb:', error);
    }
  );

  animate();
}

function goToPosition(view) {
  let targetCamObj = null;

  if (view === 'camara1') targetCamObj = camara1Obj;
  else if (view === 'camara2') targetCamObj = camara2Obj;
  else if (view === 'camara3') targetCamObj = camara3Obj;

  if (!targetCamObj) return;

  const pos = targetCamObj.position.clone();
  const quat = targetCamObj.quaternion.clone(); // ← seguimos usando quaternion
  let fov = 45; // ← valor base del FOV
  let enableZoom = false; // ← por defecto no permitimos zoom
  let minZoom = null, maxZoom = null; // ← configuramos sólo si queremos

  // Personalizamos FOV y zoom según la cámara
  if (view === 'camara1') {
    fov = 32;
    enableZoom = false; // no permitir zoom
  } else if (view === 'camara2') {
    fov = 32;
    enableZoom = false; // no permitir zoom
  } else if (view === 'camara3') {
    fov = 32;
    enableZoom = false; // en camara3 sí permitimos un poquito de zoom
    minZoom = pos.length() * 0.9;
    //maxZoom = pos.length() * 1.1;
  }

  // Actualizar FOV
  camera.fov = fov;
  camera.updateProjectionMatrix();

  // Animar la posición
  gsap.to(camera.position, {
    duration: 2.5,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    ease: "power2.out",
    onUpdate: () => {
      camera.lookAt(0, 0, 0);
    },
    onComplete: () => {
      // Cuando termina el movimiento, configuramos los controles
      controls.enableZoom = enableZoom;

      if (enableZoom && minZoom !== null && maxZoom !== null) {
        controls.minDistance = minZoom;
        controls.maxDistance = maxZoom;
      }

      controls.enableRotate = true;
      controls.enablePan = false;
      controls.update();
    }
  });

  // Animar rotación usando quaternions
  const startQuat = camera.quaternion.clone();
  const endQuat = quat;

  let obj = { t: 0 };
  gsap.to(obj, {
    duration: 2.5,
    t: 1,
    ease: "power2.out",
    onUpdate: () => {
      THREE.Quaternion.slerp(startQuat, endQuat, camera.quaternion, obj.t);
    }
  });
}





function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render(); // En lugar de renderer.render()
}


function generateUI() {
  const form = document.getElementById('textureForm');
  const templateControl = document.querySelector('.face-control');

  Object.keys(objetosEditables).forEach((nombre) => {
    const control = templateControl.cloneNode(true);
    control.setAttribute('data-name', nombre);
    control.querySelector('label').textContent = nombre + ':';

    const select = control.querySelector('.type-select');

    // Configurar las opciones del select
    select.innerHTML = `
      <option value="">Elegir opción</option>
      <option value="color">Color</option>
      <option value="imagen">Imagen</option>
    `;

    // Ocultar inputs inicialmente
    control.querySelector('.color-input').style.display = 'none';
    control.querySelector('.image-input').style.display = 'none';

    form.insertBefore(control, form.querySelector('button'));
  });

  // Eliminar el control base oculto (el que sirvió de plantilla)
  templateControl.remove();

  // Mostrar el input correcto (color o imagen)
  form.querySelectorAll('.face-control').forEach(function (control) {
    const select = control.querySelector('.type-select');
    const colorInput = control.querySelector('.color-input');
    const imageInput = control.querySelector('.image-input');

    select.addEventListener('change', function () {
      if (select.value === 'color') {
        colorInput.style.display = 'inline-block';
        imageInput.style.display = 'none';
      } else if (select.value === 'imagen') {
        colorInput.style.display = 'none';
        imageInput.style.display = 'inline-block';
      } else {
        colorInput.style.display = 'none';
        imageInput.style.display = 'none';
      }
    });
  });

  form.addEventListener('submit', handleApplyTextures);
}

function handleApplyTextures(e) {
  e.preventDefault();

  document.querySelectorAll('.face-control').forEach(function (control) {
    const name = control.getAttribute('data-name');
    const mesh = objetosEditables[name];
    if (!mesh) return;

    const type = control.querySelector('.type-select').value;

    if (type === 'color') {
      const color = control.querySelector('.color-input').value;
      mesh.material.map = null;
      mesh.material.color.set(color);
      mesh.material.needsUpdate = true;
    } else if (type === 'imagen') {
      const file = control.querySelector('.image-input').files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const tex = new THREE.TextureLoader().load(event.target.result, function (texture) {
            texture.flipY = false;
            mesh.material.map = texture;
            mesh.material.color.set(0xffffff);
            mesh.material.needsUpdate = true;
          });
        };
        reader.readAsDataURL(file);
      }
    }
    // Si está en "Elegir opción", no se aplica nada.
  });
}

const fullscreenBtn = document.getElementById('fullscreenBtn');
const textureForm = document.getElementById('textureForm');
const container = document.getElementById('container');
const fullscreenTarget = document.querySelector('.containerMODELO');

let isFullscreen = false;

fullscreenBtn.addEventListener('click', () => {
  if (!isFullscreen) {
    if (fullscreenTarget.requestFullscreen) {
      fullscreenTarget.requestFullscreen();
    } else if (fullscreenTarget.webkitRequestFullscreen) {
      fullscreenTarget.webkitRequestFullscreen();
    } else if (fullscreenTarget.msRequestFullscreen) {
      fullscreenTarget.msRequestFullscreen();
    }
  } else {
    // salir del fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
});

document.addEventListener('fullscreenchange', () => {
  isFullscreen = !!document.fullscreenElement;

  if (isFullscreen) {
    // Ajustes para modo fullscreen
    textureForm.style.display = 'none';
    fullscreenBtn.textContent = 'Salir de Pantalla Completa';
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  } else {
    // Volver al modo inicial
    textureForm.style.display = 'block';
    fullscreenBtn.textContent = 'Pantalla Completa';
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
    camera.aspect = (window.innerWidth * 0.7) / window.innerHeight;
    camera.updateProjectionMatrix();
  }
});

const saveImageBtn = document.getElementById('saveImageBtn');

saveImageBtn.addEventListener('click', () => {
  const originalSize = {
    width: renderer.domElement.width,
    height: renderer.domElement.height,
  };
  const originalAspect = camera.aspect;

  const exportWidth = 1920;
  const exportHeight = 1080;

  renderer.setSize(exportWidth, exportHeight, false);
  composer.setSize(exportWidth, exportHeight); // TAMBIÉN ajustar el composer

  camera.aspect = exportWidth / exportHeight;
  camera.updateProjectionMatrix();

  // Render CON postprocesado
  composer.render();

  const dataURL = renderer.domElement.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'captura_modelo.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Restaurar
  renderer.setSize(originalSize.width, originalSize.height, false);
  composer.setSize(originalSize.width, originalSize.height); // Restaurar también composer
  camera.aspect = originalAspect;
  camera.updateProjectionMatrix();

  composer.render(); // Vuelve a renderizar con las dimensiones normales
});

