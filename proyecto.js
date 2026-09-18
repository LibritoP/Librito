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




async function handleSubmit(event) {
    event.preventDefault();
  
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value.trim();
    const usernameInput = document.getElementById('user-name');
    const username = usernameInput ? usernameInput.value.trim() : '';
  
    if (!email || !password) {
      showMessage('Por favor completa los campos.', 'error');
      return;
    }
  
    if (currentMode === 'register') {
      try {
        // 1. Crear cuenta en Firebase
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;
        const profileName = username !== '' ? username : email.split('@')[0];
  
        await window.updateProfile(user, { displayName: profileName });
  
        showMessage(`¡Cuenta creada con éxito! Bienvenido, ${profileName}`, 'success');
  
        // Registro nuevo: pasa SIEMPRE al Onboarding para elegir materias
        setTimeout(() => showProfileSetup(), 1000);
  
      } catch (error) {
        console.error(error);
        showMessage('Error al crear cuenta en Firebase.', 'error');
      }
    } else {
      try {
        // 2. Autenticar usuario con Firebase
        const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;
        const profileName = user.displayName || email.split('@')[0];
  
        showMessage(`¡Inicio de sesión exitoso! Bienvenido, ${profileName}`, 'success');
  
        // 3. Consultar en Firestore si ya completó el perfil de materias
        setTimeout(async () => {
          try {
            const userDoc = await window.getDoc(window.doc(window.db, "perfiles", user.uid));
  
            if (userDoc && userDoc.exists()) {
              showDashboard(profileName); // Ya tiene materias, va al Dashboard
            } else {
              showProfileSetup(); // No tiene perfil cargado, va al Onboarding
            }
          } catch (err) {
            console.warn("Error al consultar Firestore, derivando a Onboarding:", err);
            showProfileSetup();
          }
        }, 1000);
  
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



function mostrarModalMaterias() {
    const modal = document.getElementById('modal-materias-error');
    if (modal) modal.style.display = 'flex';
    }
  
   function cerrarModalMaterias() {
    const modal = document.getElementById('modal-materias-error');
    if (modal) modal.style.display = 'none';
   }
  
   window.mostrarModalMaterias = mostrarModalMaterias;
   window.cerrarModalMaterias = cerrarModalMaterias;

   async function guardarPerfilInicial(event) {
    if (event) event.preventDefault();
  
    // 1. Obtener los checkboxes seleccionados
    const buenasChecked = document.querySelectorAll('input[name="mat_buena"]:checked');
    const malasChecked = document.querySelectorAll('input[name="mat_mala"]:checked');
  
    // 2. Validar mínimo 2 materias por grupo
    if (buenasChecked.length < 2 || malasChecked.length < 2) {
      if (typeof mostrarModalMaterias === 'function') {
        mostrarModalMaterias();
      }
      return;
    }
  
    // Cerrar el modal flotante si estaba abierto
    if (typeof cerrarModalMaterias === 'function') {
      cerrarModalMaterias();
    }
  
    // 3. Obtener materias y datos del perfil
    const materiasFuertes = Array.from(buenasChecked).map(cb => cb.value);
    const materiasDebiles = Array.from(malasChecked).map(cb => cb.value);
  
    const anio = document.getElementById('setup-anio')?.value || '';
    const especialidad = document.getElementById('setup-especialidad')?.value || 'General';
  
    try {
      // Detectar usuario autenticado
      const user = window.auth?.currentUser || (typeof firebase !== 'undefined' ? firebase.auth().currentUser : null);
  
      if (user && window.db) {
        // Guardar en Firestore con Modular SDK expuesto en window
        const docRef = window.doc(window.db, "perfiles", user.uid);
        await window.setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          anio: anio,
          especialidad: especialidad,
          materiasFuertes: materiasFuertes,
          materiasDebiles: materiasDebiles,
          puntos: 100,
          creadoEn: new Date()
        });
  
        console.log("Perfil guardado con éxito en Firestore.");
      }
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
    }
  
    // 4. Cambiar vistas de forma limpia
    const profileSetupView = document.getElementById('profile-setup-view');
    if (profileSetupView) {
      profileSetupView.style.display = 'none';
    }
  
    // Cambiar al Dashboard reconociendo cualquier función de navegación existente
    if (typeof showDashboard === 'function') {
      showDashboard("Usuario");
    } else if (typeof mostrarDashboard === 'function') {
      mostrarDashboard();
    } else {
      const dashboardView = document.getElementById('dashboard-view');
      if (dashboardView) dashboardView.style.display = 'flex';
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

}

// Función universal para cambiar de vista limpia
function mostrarVista(idVista) {
  // 1. Ocultar todas las pantallas activas
  const VISTAS = ['auth-view', 'profile-setup-view', 'dashboard-view'];
  VISTAS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // 2. Mostrar únicamente la vista solicitada
  const vistaTarget = document.getElementById(idVista);
  if (vistaTarget) {
    vistaTarget.style.display = idVista === 'auth-view' ? 'flex' : 'block';
  }
}

// Reemplazo para la navegación al Dashboard
function showDashboard(nombreUsuario) {
  mostrarVista('dashboard-view');
  
  // Cargar datos en la interfaz
  const pnts = document.getElementById('user-points');
  if (pnts) pnts.textContent = "100";
}

// 1. Funciones del Modal Personalizado
function mostrarModalNotificacion(titulo, mensaje) {
  const modal = document.getElementById('modal-notificacion');
  const txtTitulo = document.getElementById('modal-titulo');
  const txtMensaje = document.getElementById('modal-mensaje');

  if (modal && txtTitulo && txtMensaje) {
    txtTitulo.textContent = titulo;
    txtMensaje.textContent = mensaje;
    modal.style.display = 'flex';
  }
}

function cerrarModalNotificacion() {
  const modal = document.getElementById('modal-notificacion');
  if (modal) modal.style.display = 'none';
}

// 2. Función de Recuperación de Contraseña
async function recuperarContrasena(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('user-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    mostrarModalNotificacion(
      "Campo incompleto", 
      "Por favor, escribí tu correo electrónico en el campo correspondiente para enviarte el enlace."
    );
    return;
  }

  try {
    if (window.auth && window.sendPasswordResetEmail) {
      await window.sendPasswordResetEmail(window.auth, email);
      mostrarModalNotificacion(
        "¡Correo enviado!", 
        `Te enviamos un enlace a ${email} para restablecer tu contraseña. Revisá tu bandeja de entrada o spam.`
      );
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
      await firebase.auth().sendPasswordResetEmail(email);
      mostrarModalNotificacion(
        "¡Correo enviado!", 
        `Te enviamos un enlace a ${email} para restablecer tu contraseña.`
      );
    } else {
      throw new Error("El módulo de autenticación no está disponible.");
    }
  } catch (error) {
    console.error("Error al enviar correo de recuperación:", error);

    if (error.code === 'auth/user-not-found') {
      mostrarModalNotificacion("Usuario no encontrado", "No existe ninguna cuenta registrada con este correo.");
    } else if (error.code === 'auth/invalid-email') {
      mostrarModalNotificacion("Correo inválido", "El correo ingresado no tiene un formato válido.");
    } else {
      mostrarModalNotificacion("Error", "Ocurrió un error al intentar enviar el correo. Intentalo de nuevo.");
    }
  }
}

// 3. Exponer funciones globalmente
window.mostrarModalNotificacion = mostrarModalNotificacion;
window.cerrarModalNotificacion = cerrarModalNotificacion;
window.recuperarContrasena = recuperarContrasena;
