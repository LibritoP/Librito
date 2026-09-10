const LOGO_DIA = 'libritol.png';
const LOGO_NOCHE = 'libritos1.png';


let currentMode = 'login';


function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const logoImg = document.getElementById('app-logo');
  const isDark = body.classList.contains('theme-dark');


  if (isDark) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    themeIcon.className = 'ri-moon-fill';
    logoImg.src = LOGO_DIA;
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    themeIcon.className = 'ri-sun-fill';
    logoImg.src = LOGO_NOCHE;
  }
}


function setAuthMode(mode) {
  currentMode = mode;
  const groupUsername = document.getElementById('group-username');
  const btnSubmit = document.getElementById('btn-submit');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const msgBox = document.getElementById('message-box');


  msgBox.style.display = 'none';


  if (mode === 'register') {
    groupUsername.style.display = 'flex';
    btnSubmit.textContent = 'REGISTRARSE';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  } else {
    groupUsername.style.display = 'none';
    btnSubmit.textContent = 'INGRESAR';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  }
}


// PROCESO DE REGISTRO E INICIO CON EMAIL EN FIREBASE
async function handleSubmit(event) {
  event.preventDefault();


  const email = document.getElementById('user-email').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const username = document.getElementById('user-name').value.trim();


  if (!email || !password) {
    showMessage('Por favor completa los campos.', 'error');
    return;
  }


  if (currentMode === 'register') {
    try {
      // Envía datos reales a la base de Firebase
      const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      const profileName = username !== '' ? username : email.split('@')[0];


      await window.updateProfile(user, { displayName: profileName });


      showMessage(`¡Cuenta creada con éxito! Bienvenido, ${profileName}`, 'success');
      setTimeout(() => showDashboard(profileName), 1000);


    } catch (error) {
      console.error(error);
      showMessage('Error al crear cuenta en Firebase.', 'error');
    }
  } else {
    try {
      // Autentica usuario real con Firebase
      const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      const profileName = user.displayName || email.split('@')[0];


      showMessage(`¡Inicio de sesión exitoso! Bienvenido, ${profileName}`, 'success');
      setTimeout(() => showDashboard(profileName), 1000);


    } catch (error) {
      console.error(error);
      showMessage('Correo o contraseña incorrectos.', 'error');
    }
  }
}


async function handleGoogleLogin() {
  try {
    // 1. Prepara el proveedor de autenticación de Google
    const provider = new window.GoogleAuthProvider();


    // 2. ABRE LA VENTANA EMERGENTE de Google para elegir la cuenta
    const result = await window.signInWithPopup(window.auth, provider);


    // 3. Una vez elegida la cuenta, obtiene los datos reales de Google
    const user = result.user;
    const displayName = user.displayName || user.email.split('@')[0];


    showMessage(`¡Sesión iniciada con Google! Bienvenido/a, ${displayName}`, 'success');


    // 4. Te redirige al Dashboard con tu nombre real de Google
    setTimeout(() => {
      showProfileSetup();
    }, 1000);


  } catch (error) {
    console.error("Error al autenticar con Google:", error);
   
    // Si el usuario cierra el cartel o no autoriza la cuenta
    if (error.code === 'auth/popup-closed-by-user') {
      showMessage('Cancelaste la ventana de inicio de sesión de Google.', 'error');
    } else {
      showMessage('No se pudo conectar con la cuenta de Google.', 'error');
    }
  }
}


function showProfileSetup() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('profile-setup-view').style.display = 'flex';
}


function handleLogout() {
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('auth-view').style.display = 'flex';
  const msgBox = document.getElementById('message-box');
  msgBox.className = 'message-box';
  msgBox.style.display = 'none';
}


function showMessage(text, type) {
  const msgBox = document.getElementById('message-box');
  msgBox.textContent = text;
  msgBox.className = `message-box ${type}`;
  msgBox.style.display = 'block';
}


// LISTAS DE MATERIAS
const MATERIAS_COMPUTACION = [
  "Algoritmos", "Base de Datos", "Log. computacional", "Proyecto inf.",
  "Org. computacional", "Historia", "Matemática",
  "Lengua y Lit.", "Ingles", "Geografia"
];


const MATERIAS_AUTOMOTOR = [
  "Mec. y resistiv.", "Matematica", "Ciudadana",
  "Mecanismo", "Lengua y Lit.", "neumatica",
  "Electricidad", "Alineacion", "Balanceo", "Inyeccion",  "Estatica", "Ingles"
];


const MATERIAS_GENERALES = [
  "Matemática", "Lengua y Literatura", "Historia", "Geografía",
  "Biología", "Física", "Química", "Inglés", "Educación Física", "Ciudadana", "Dibujo Artístico","Dibujo Tecnico"
];


// Mostrar/Ocultar Especialidad según el Año
function evaluarAnioEspecialidad(anio) {
  const groupEsp = document.getElementById('group-especialidad');
  const anioNum = parseInt(anio, 10);


  if (anioNum >= 4) {
    groupEsp.style.display = 'block';
    document.getElementById('setup-especialidad').required = true;
    renderizarCheckboxesMaterias([]); // Limpiar hasta elegir especialidad
  } else {
    groupEsp.style.display = 'none';
    document.getElementById('setup-especialidad').required = false;
    renderizarCheckboxesMaterias(MATERIAS_GENERALES);
  }
}


function cargarMateriasPorEspecialidad(esp) {
  if (esp === 'computacion') {
    renderizarCheckboxesMaterias(MATERIAS_COMPUTACION);
  } else if (esp === 'automotor') {
    renderizarCheckboxesMaterias(MATERIAS_AUTOMOTOR);
  } else {
    renderizarCheckboxesMaterias([]);
  }
}


// Crear los checkboxes para seleccionar materias
function renderizarCheckboxesMaterias(lista) {
  const contBuenas = document.getElementById('container-materias-buenas');
  const contMalas = document.getElementById('container-materias-malas');


  if (lista.length === 0) {
    contBuenas.innerHTML = '<p class="text-muted">Seleccioná una especialidad.</p>';
    contMalas.innerHTML = '<p class="text-muted">Seleccioná una especialidad.</p>';
    return;
  }


  let htmlBuenas = '';
  let htmlMalas = '';


  lista.forEach((mat, idx) => {
    htmlBuenas += `<label><input type="checkbox" name="mat_buena" value="${mat}"> ${mat}</label>`;
    htmlMalas += `<label><input type="checkbox" name="mat_mala" value="${mat}"> ${mat}</label>`;
  });


  contBuenas.innerHTML = htmlBuenas;
  contMalas.innerHTML = htmlMalas;
}


// Modificar la función tras iniciar sesión para mandar al Onboarding primero
function showProfileSetup() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('profile-setup-view').style.display = 'flex';
}


// Validar y Guardar Perfil (Valida mínimo 3 materias)
async function guardarPerfilInicial(event) {
  event.preventDefault();


  const buenasChecked = document.querySelectorAll('input[name="mat_buena"]:checked');
  const malasChecked = document.querySelectorAll('input[name="mat_mala"]:checked');


  if (buenasChecked.length < 3) {
    alert("Por favor seleccioná al menos 3 materias que dominás.");
    return;
  }


  if (malasChecked.length < 3) {
    alert("Por favor seleccioná al menos 3 materias en las que necesites ayuda.");
    return;
  }


  // Guardar en Firestore (Opcional si querés persistirlo)
  const user = window.auth.currentUser;
  if (user) {
    try {
      await window.addDoc(window.collection(window.db, "perfiles"), {
        uid: user.uid,
        rolInicial: document.querySelector('input[name="rol"]:checked').value,
        anio: document.getElementById('setup-anio').value,
        especialidad: document.getElementById('setup-especialidad').value || 'N/A',
        materiasBuenas: Array.from(buenasChecked).map(c => c.value),
        descBuenas: document.getElementById('desc-buenas').value,
        materiasMalas: Array.from(malasChecked).map(c => c.value),
        descMalas: document.getElementById('desc-malas').value
      });
    } catch (e) { console.error(e); }
  }


  // Pasar finalmente al Dashboard
  document.getElementById('profile-setup-view').style.display = 'none';
  showDashboard(user ? (user.displayName || user.email) : 'Usuario');
}
