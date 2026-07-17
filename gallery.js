const worksElement = document.querySelector("#works");
const countElement = document.querySelector("#work-count");
const template = document.querySelector("#work-card");

fetch("./works.json")
  .then((response) => {
    if (!response.ok) throw new Error("作品一覧を読み込めませんでした。");
    return response.json();
  })
  .then((works) => {
    countElement.textContent = `${works.length}この絵本`;

    for (const work of works) {
      const card = template.content.cloneNode(true);
      const link = card.querySelector("a");
      link.href = work.path;
      link.setAttribute("aria-label", `${work.title}であそぶ`);
      card.querySelector(".work-card__image").src = work.thumbnail;
      card.querySelector(".work-card__number").textContent = work.number;
      card.querySelector(".work-card__title").textContent = work.title;
      card.querySelector(".work-card__description").textContent = work.description;
      worksElement.append(card);
    }
  })
  .catch((error) => {
    worksElement.textContent = error.message;
  });
