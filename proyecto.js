async function cargarComunidadDesdeFirestore() {
  let usuariosReales = [];
  const usuarioActual = window.auth && window.auth.currentUser;

  if (window.db && window.collection && window.getDocs) {
    try {
      const querySnapshot = await window.getDocs(window.collection(window.db, "perfiles"));
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const esElMio = usuarioActual && docSnap.id === usuarioActual.uid;

        usuariosReales.push({
          name: (data.displayName || "Usuario") + (esElMio ? " (Tú)" : ""),
          year: data.anio ? data.anio + ".º Año" : "1.º Año",
          orientation: data.especialidad || "General",
          status: "online",
          stars: 5,
          goodSubjects: data.materiasBuenas || [],
          goodDesc: data.descBuenas || "",
          badSubjects: data.materiasMalas || [],
          badDesc: data.descMalas || "",
          esPropio: esElMio
        });
      });
    } catch (error) {
      console.error("Error al cargar la comunidad desde Firestore:", error);
    }
  }

  // Si por alguna razón Firestore está vacío o tardó, aseguramos al menos mostrar tu usuario local
  if (usuariosReales.length === 0 && appState.user && appState.user.username) {
    usuariosReales.push({
      name: appState.user.username + " (Tú)",
      year: appState.user.year || "1.º Año",
      orientation: appState.user.orientation || "General",
      status: appState.user.status || "online",
      stars: 5,
      goodSubjects: appState.user.goodSubjects || [],
      goodDesc: appState.user.goodDesc || "",
      badSubjects: appState.user.badSubjects || [],
      badDesc: appState.user.badDesc || "",
      esPropio: true
    });
  }

  communityUsers = usuariosReales;
  renderUsersList(communityUsers);
}
