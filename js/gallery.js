const data = window.GALLERY_DATA || { people: [], photos: [], totalPhotos: 0, totalPeople: 0 };

const heroArt = document.querySelector("#heroArt");
const peopleView = document.querySelector("#peopleView");
const photosView = document.querySelector("#photosView");
const searchInput = document.querySelector("#searchInput");
const tabs = document.querySelectorAll(".tab");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxName = document.querySelector("#lightboxName");
const lightboxMeta = document.querySelector("#lightboxMeta");

document.querySelector("#totalPhotos").textContent = data.totalPhotos;
document.querySelector("#totalPeople").textContent = data.totalPeople;
document.querySelector("#topCount").textContent = Math.max(0, ...data.people.map((person) => person.count));
document.querySelector("#generatedAt").textContent = data.generatedAt || "--";

function phraseFor(count) {
  if (count >= 5) return "像一組完整作品集，讓整場課的能量被看見。";
  if (count >= 3) return "把靈感整理成一段完整的視覺旅程。";
  if (count === 2) return "兩張作品剛好看見想法開始長出形狀。";
  return "這張成果是完成任務的紀念，也是一個值得被看見的開始。";
}

function imageSrc(photo) {
  return photo.localUrl || photo.thumbUrl || "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function matchesText(value, keyword) {
  return String(value || "").toLowerCase().includes(keyword);
}

function renderHero() {
  const featured = data.photos.slice(-20).reverse();
  heroArt.innerHTML = featured.map((photo) => `
    <button class="hero-tile" type="button" aria-label="開啟 ${escapeHtml(photo.displayName)} 的成果">
      <img src="${imageSrc(photo)}" alt="${escapeHtml(photo.displayName)} 的成果照片" loading="eager">
      <span>${escapeHtml(photo.displayName)}</span>
    </button>
  `).join("");
  heroArt.querySelectorAll(".hero-tile").forEach((tile, index) => {
    tile.addEventListener("click", () => openLightbox(featured[index]));
  });
}

function renderPeople() {
  const keyword = searchInput.value.trim().toLowerCase();
  peopleView.innerHTML = "";
  data.people
    .filter((person) => !keyword || matchesText(person.name, keyword) || person.photos.some((photo) => matchesText(photo.fileName, keyword)))
    .forEach((person) => {
      const cover = person.photos[person.photos.length - 1];
      const article = document.createElement("article");
      article.className = "person-card";
      article.innerHTML = `
        <button class="person-main" type="button" aria-label="開啟 ${escapeHtml(person.name)} 的代表成果">
          <img class="person-cover" src="${imageSrc(cover)}" alt="${escapeHtml(person.name)} 的成果照片" loading="lazy">
          <div class="person-body">
            <span class="person-kicker">${person.count} 張成果</span>
            <h3 class="person-title">${escapeHtml(person.name)}</h3>
            <p class="person-note">${phraseFor(person.count)}</p>
          </div>
        </button>
        <div class="mini-strip"></div>
      `;
      article.querySelector(".person-main").addEventListener("click", () => openLightbox(cover));
      const strip = article.querySelector(".mini-strip");
      person.photos.slice(-4).forEach((photo) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", `開啟 ${photo.displayName} 的照片`);
        button.innerHTML = `<img src="${imageSrc(photo)}" alt="${escapeHtml(photo.displayName)} 的成果縮圖" loading="lazy">`;
        button.addEventListener("click", () => openLightbox(photo));
        strip.appendChild(button);
      });
      peopleView.appendChild(article);
    });
}

function renderPhotos() {
  const keyword = searchInput.value.trim().toLowerCase();
  photosView.innerHTML = "";
  data.photos
    .filter((photo) => !keyword || matchesText(photo.displayName, keyword) || matchesText(photo.fileName, keyword))
    .slice()
    .reverse()
    .forEach((photo) => {
      const button = document.createElement("button");
      button.className = "photo-card";
      button.type = "button";
      button.innerHTML = `
        <img src="${imageSrc(photo)}" alt="${escapeHtml(photo.displayName)} 的成果照片" loading="lazy">
        <span>${escapeHtml(photo.displayName)}</span>
      `;
      button.addEventListener("click", () => openLightbox(photo));
      photosView.appendChild(button);
    });
}

function openLightbox(photo) {
  lightboxImage.src = imageSrc(photo);
  lightboxImage.alt = `${photo.displayName} 的成果照片`;
  lightboxName.textContent = photo.displayName;
  lightboxMeta.textContent = photo.fileName;
  if (typeof lightbox.showModal === "function") lightbox.showModal();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    const view = tab.dataset.view;
    peopleView.classList.toggle("is-hidden", view !== "people");
    photosView.classList.toggle("is-hidden", view !== "photos");
  });
});

searchInput.addEventListener("input", () => {
  renderPeople();
  renderPhotos();
});

document.querySelector(".close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

renderHero();
renderPeople();
renderPhotos();
