"use client";

function getViewportStep() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function scrollByViewport(direction: 1 | -1) {
  window.scrollBy({
    top: direction * getViewportStep(),
    behavior: "smooth",
  });
}

export function MobilePageTurnZones() {
  return (
    <>
      <button
        type="button"
        aria-label="Прокрутить вверх на экран"
        className="fixed inset-y-28 left-0 z-10 w-14 cursor-pointer touch-manipulation sm:hidden"
        onClick={() => scrollByViewport(-1)}
      />
      <button
        type="button"
        aria-label="Прокрутить вниз на экран"
        className="fixed inset-y-28 right-0 z-10 w-14 cursor-pointer touch-manipulation sm:hidden"
        onClick={() => scrollByViewport(1)}
      />
    </>
  );
}
