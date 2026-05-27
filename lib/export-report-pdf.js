'use client';

const CAPTURE_ATTR = "data-gi-pdf-capture";

/**
 * 캡처용 오프스크린 클론 — flex/overflow 부모 영향 없이 전체 높이 렌더
 */
function buildCaptureClone(source) {
  const width = Math.max(source.scrollWidth, source.getBoundingClientRect().width, 640);
  const wrapper = document.createElement("div");
  wrapper.setAttribute(CAPTURE_ATTR, "wrapper");
  wrapper.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${width}px`,
    "z-index:-1",
    "pointer-events:none",
    "overflow:visible",
  ].join(";");

  const clone = source.cloneNode(true);
  clone.setAttribute(CAPTURE_ATTR, "root");
  clone.style.cssText = [
    "display:block",
    "position:relative",
    "left:auto",
    "top:auto",
    "flex:none",
    "min-width:0",
    "width:100%",
    "max-width:none",
    "height:auto",
    "overflow:visible",
    "box-sizing:border-box",
  ].join(";");

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone, width };
}

function releaseCaptureClone(wrapper) {
  if (wrapper?.parentNode) {
    wrapper.parentNode.removeChild(wrapper);
  }
}

function patchCloneForFullRender(clonedDoc, clonedRoot) {
  let node = clonedRoot;
  while (node) {
    if (node.style) {
      node.style.overflow = "visible";
      node.style.overflowX = "visible";
      node.style.overflowY = "visible";
      node.style.maxHeight = "none";
      node.style.height = "auto";
    }
    node = node.parentElement;
  }

  clonedRoot.querySelectorAll("*").forEach((el) => {
    if (!el.style) return;
    const cs = clonedDoc.defaultView?.getComputedStyle(el);
    if (!cs) return;
    if (cs.overflow === "hidden" || cs.overflow === "auto" || cs.overflow === "scroll") {
      el.style.overflow = "visible";
    }
    if (cs.overflowX === "hidden" || cs.overflowX === "auto" || cs.overflowX === "scroll") {
      el.style.overflowX = "visible";
    }
    if (cs.overflowY === "hidden" || cs.overflowY === "auto" || cs.overflowY === "scroll") {
      el.style.overflowY = "visible";
    }
  });
}

/**
 * DOM 영역을 고해상도(scale 3) PNG로 캡처 후 A4 PDF 저장
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{ backgroundColor?: string }} options
 */
export async function exportElementToPdf(element, filename, options = {}) {
  if (!element || typeof window === "undefined") {
    throw new Error("PDF 출력 대상 요소를 찾을 수 없습니다.");
  }

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const bg =
    options.backgroundColor ||
    window.getComputedStyle(element).backgroundColor ||
    "#080c14";
  const backgroundColor = bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? "#080c14" : bg;

  const { wrapper, clone, width } = buildCaptureClone(element);

  try {
    const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1);

    const canvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width,
      height: captureHeight,
      windowWidth: width,
      windowHeight: captureHeight,
      onclone: (clonedDoc, clonedEl) => {
        patchCloneForFullRender(clonedDoc, clonedEl);
        clonedEl.style.backgroundColor = backgroundColor;
      },
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 10;
    const contentWidthMm = pageWidthMm - marginMm * 2;
    const contentHeightMm = pageHeightMm - marginMm * 2;

    const imgHeightMm = (canvas.height * contentWidthMm) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let offsetMm = 0;
    let pageIndex = 0;

    while (offsetMm < imgHeightMm) {
      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(
        imgData,
        "PNG",
        marginMm,
        marginMm - offsetMm,
        contentWidthMm,
        imgHeightMm,
        undefined,
        "FAST"
      );
      offsetMm += contentHeightMm;
      pageIndex += 1;
    }

    pdf.save(filename || "guild-insight-report.pdf");
  } finally {
    releaseCaptureClone(wrapper);
  }
}
