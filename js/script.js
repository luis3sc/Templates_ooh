let scene, camera, renderer, cube, controls;
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
  camera.position.set(2, 2, 3); // Cambiar la posición de la cámara si es necesario
  camera.lookAt(0, 0, 0);

  // Configurar renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
  renderer.setClearColor(0x808080);
  document.getElementById('container').appendChild(renderer.domElement);

  // Luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;

  

  // Cargar modelo GLB
  const loader = new THREE.GLTFLoader();
  loader.load(
    'vallamovilTRA.glb',
    function (gltf) {
      cube = gltf.scene;
      scene.add(cube);

      cube.traverse(function (child) {
        if (child.isMesh && objetosEditables.hasOwnProperty(child.name)) {
          child.material = child.material.clone(); // Para que no compartan material
          objetosEditables[child.name] = child;
        }

        // Capturar los objetos "camara1", "camara2" y "camara3"
        if (child.name === 'camara1') {
          camara1Obj = child;
        } else if (child.name === 'camara2') {
          camara2Obj = child;
        } else if (child.name === 'camara3') {
          camara3Obj = child;
        }
      });
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
  renderer.render(scene, camera);
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
  // Guardar el tamaño original del renderer
  const originalSize = {
    width: renderer.domElement.width,
    height: renderer.domElement.height,
  };
  const originalAspect = camera.aspect;

  // Definir el tamaño para exportar (por ejemplo, 1920x1080)
  const exportWidth = 1920;  // Puedes ajustarlo según lo necesites
  const exportHeight = 1080; // Lo mismo aquí

  // Cambiar temporalmente el tamaño del renderer
  renderer.setSize(exportWidth, exportHeight, false);

  // Ajustar el aspect ratio de la cámara para coincidir con el nuevo tamaño
  camera.aspect = exportWidth / exportHeight;
  camera.updateProjectionMatrix();

  // Renderizar la escena con el nuevo tamaño
  renderer.render(scene, camera);

  // Obtener la imagen como DataURL
  const dataURL = renderer.domElement.toDataURL('image/png');

  // Crear un enlace de descarga
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'captura_modelo.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Restaurar el tamaño original del renderer
  renderer.setSize(originalSize.width, originalSize.height, false);
  camera.aspect = originalAspect;
  camera.updateProjectionMatrix();

  // Renderizar nuevamente con los ajustes originales de cámara
  renderer.render(scene, camera);
});
