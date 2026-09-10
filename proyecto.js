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

// [ERROR CORREGIDO #3]: Se reemplazó el setTimeout por autenticación real de correo y contraseña
async function handleSubmit(event) {
  event.preventDefault();

  const email = document.getElementById('user-email').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const username = document.getElementById('user-name').value.trim();

  if (!email || !password) {
    showMessage('Por favor completa el correo y la contraseña.', 'error');
    return;
  }

  if (currentMode === 'register') {
    try {
      const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      const profileName = username !== '' ? username : email.split('@')[0];

      await window.updateProfile(user, { displayName: profileName });

      showMessage(`¡Cuenta creada con éxito! Bienvenido, ${profileName}`, 'success');
      setTimeout(() => showDashboard(profileName), 1000);

    } catch (error) {
      console.error("Error en registro:", error);
      showMessage('Error al registrar la cuenta en Firebase.', 'error');
    }
  } else {
    try {
      const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      const profileName = user.displayName || email.split('@')[0];

      showMessage(`¡Inicio de sesión exitoso! Bienvenido, ${profileName}`, 'success');
      setTimeout(() => showDashboard(profileName), 1000);

    } catch (error) {
      console.error("Error en inicio de sesión:", error);
      showMessage('Correo o contraseña incorrectos.', 'error');
    }
  }
}

// [ERROR CORREGIDO #4]: Se eliminó el texto "[MODIFICAR FUTURO]" y se activó la ventana emergente de Google
async function handleGoogleLogin() {
  try {
    const provider = new window.GoogleAuthProvider();
    const result = await window.signInWithPopup(window.auth, provider);
    const user = result.user;
    const displayName = user.displayName || user.email.split('@')[0];

    showMessage(`¡Sesión iniciada con Google! Bienvenido/a, ${displayName}`, 'success');
    setTimeout(() => showDashboard(displayName), 1000);

  } catch (error) {
    console.error("Error al iniciar con Google:", error);
    showMessage('No se pudo conectar con la cuenta de Google.', 'error');
  }
}

function showDashboard(userName) {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  document.getElementById('welcome-user-text').textContent = `¡Bienvenido/a, ${userName}!`;
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
