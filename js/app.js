$(document).ready(function () {
  const $notesList = $("#notesList");
  let allDocs = []; // Array of QueryDocumentSnapshot
  let showFavoritesOnly = false;
  let unsubscribe = null; // Firestore listener

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderNote(doc) {
    const data = doc.data();
    const created = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "(pending...)";
    const favSym = data.favorite ? "⭐" : "☆";

    const $note = $(`
      <div class="note" data-id="${doc.id}">
        <h3 class="note-title"></h3>
        <div class="meta"></div>
        <div class="body note-content"></div>
        <div class="actions">
          <span class="link favorite" title="Toggle favorite">${favSym}</span>
          <span class="link edit">✏ Edit</span>
          <span class="link delete">🗑 Delete</span>
        </div>
      </div>
    `);

    $note.find(".note-title").text(data.title || "(no title)");
    $note.find(".meta").text(created);
    $note.find(".note-content").text(data.content || "");
    $notesList.append($note);
  }

  function renderFromDocs(docsArray) {
    $notesList.empty();
    if (!docsArray.length) {
      $notesList.html("<p class='empty'>No notes found.</p>");
      return;
    }
    docsArray.forEach(renderNote);
  }

  function loadNotes() {
    if (unsubscribe) unsubscribe(); // detach previous listener

    let ref = db.collection("notes").orderBy("createdAt", "desc");
    if (showFavoritesOnly) ref = db.collection("notes").where("favorite", "==", true);

    unsubscribe = ref.onSnapshot(
      (snapshot) => {
        allDocs = snapshot.docs.slice();
        if (!showFavoritesOnly) {
          allDocs.sort((a, b) => (b.data().favorite ? 1 : 0) - (a.data().favorite ? 1 : 0));
        }
        renderFromDocs(allDocs);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        alert(
          "Failed to load notes. " +
          (err.code === "failed-precondition"
            ? "You may need to create a Firestore index."
            : "Check console for details.")
        );
      }
    );
  }

  $("#addNote").on("click", async () => {
    const title = $("#title").val().trim();
    const content = $("#content").val().trim();
    if (!title || !content) return alert("Fill in both title and content.");

    try {
      await db.collection("notes").add({
        title,
        content,
        favorite: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      $("#title").val("");
      $("#content").val("");
      $("#charCount").text("0/200");
    } catch (e) {
      console.error(e);
      alert("Failed to add note.");
    }
  });

  $notesList.on("click", ".delete", async function () {
    const id = $(this).closest(".note").data("id");
    if (!confirm("Delete this note?")) return;
    try {
      await db.collection("notes").doc(id).delete();
    } catch (e) {
      console.error(e);
      alert("Failed to delete note.");
    }
  });

  $notesList.on("click", ".favorite", async function () {
    const id = $(this).closest(".note").data("id");
    const ref = db.collection("notes").doc(id);
    try {
      const snap = await ref.get();
      const current = snap.exists && snap.data().favorite;
      await ref.update({ favorite: !current });
    } catch (e) {
      console.error(e);
      alert("Failed to toggle favorite.");
    }
  });

  $notesList.on("click", ".edit", function () {
    const $note = $(this).closest(".note");
    const currentTitle = $note.find(".note-title").text();
    const currentContent = $note.find(".note-content").text();

    $note.find(".note-title").replaceWith(
      `<input class="edit-title" value="${escapeHtml(currentTitle)}">`
    );
    $note.find(".note-content").replaceWith(
      `<textarea class="edit-content">${escapeHtml(currentContent)}</textarea>`
    );

    $(this).text("💾 Save").removeClass("edit").addClass("save");
  });

  $notesList.on("click", ".save", async function () {
    const $note = $(this).closest(".note");
    const id = $note.data("id");
    const newTitle = $note.find(".edit-title").val().trim();
    const newContent = $note.find(".edit-content").val().trim();

    if (!newTitle || !newContent) return alert("Fill in both title and content.");

    const ref = db.collection("notes").doc(id);

    try {
      const snap = await ref.get();
      const oldData = snap.data() || {};

      // Update Firestore only if changed
      if (oldData.title !== newTitle || oldData.content !== newContent) {
        await ref.update({ title: newTitle, content: newContent });
      }

      // Exit edit mode regardless of changes
      $note.find(".edit-title").replaceWith(`<h3 class="note-title">${newTitle}</h3>`);
      $note.find(".edit-content").replaceWith(`<div class="body note-content">${newContent}</div>`);
      $(this).text("✏ Edit").removeClass("save").addClass("edit");
    } catch (e) {
      console.error(e);
      alert("Failed to save changes.");
    }
  });

  $("#search").on("input", function () {
    const q = $(this).val().toLowerCase();
    if (!q) return renderFromDocs(allDocs);
    const filtered = allDocs.filter((doc) => {
      const d = doc.data();
      return (d.title || "").toLowerCase().includes(q) || (d.content || "").toLowerCase().includes(q);
    });
    renderFromDocs(filtered);
  });

  $("#content").on("input", function () {
    const len = $(this).val().length;
    $("#charCount").text(`${len}/200`);
  });

  $("#toggleFavorites").on("click", function () {
    showFavoritesOnly = !showFavoritesOnly;
    $(this).text(showFavoritesOnly ? "⭐ Showing Favorites" : "⭐ Favorites Only");
    loadNotes();
  });

  $("#toggleDark").on("click", function () {
    $("body").toggleClass("dark");
    localStorage.setItem("darkMode", $("body").hasClass("dark") ? "on" : "off");
  });

  if (localStorage.getItem("darkMode") === "on") $("body").addClass("dark");

  loadNotes();
});
