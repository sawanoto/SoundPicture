window.SoundPicture = {
  muted: false,

  init() {
    const button = document.querySelector(".sound-button");
    const controls = document.querySelectorAll(".home-button, .sound-button");

    for (const control of controls) {
      for (const eventName of ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"]) {
        control.addEventListener(eventName, (event) => event.stopPropagation(), { passive: true });
      }
    }

    if (!button) return;

    button.addEventListener("click", () => {
      this.muted = !this.muted;
      button.setAttribute("aria-pressed", String(!this.muted));
      button.textContent = this.muted ? "♩" : "♪";
      button.setAttribute("aria-label", this.muted ? "音を出す" : "音を消す");
      window.dispatchEvent(new CustomEvent("soundpicture:mutechange", {
        detail: { muted: this.muted }
      }));
    });
  }
};

window.addEventListener("DOMContentLoaded", () => window.SoundPicture.init());
