"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/locale";
import { takeHandoff } from "@/lib/handoff";

const textField = "textarea:not([readonly]):not([disabled]), input:not([type]):not([readonly]), input[type=text]:not([readonly]), input[type=search]:not([readonly])";

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // React tracks the value property, so go through the prototype setter and fire a real input event.
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Fills the tool with what the visitor pasted or dropped on the home page, then runs its main action. */
export function HandoffReceiver({ slug }: { slug: string }) {
  const t = useT();
  const anchor = useRef<HTMLSpanElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const handoff = takeHandoff(slug);
      const root = anchor.current?.closest(".workbench");
      if (!handoff || !root) return;
      if (handoff.file) {
        const input = root.querySelector<HTMLInputElement>("input[type=file]");
        if (!input) return;
        const transfer = new DataTransfer();
        transfer.items.add(handoff.file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        setNotice(t("已載入你拖放的檔案 {0}。", handoff.file.name));
        return;
      }
      const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(textField);
      if (!field || handoff.text === undefined) return;
      setNativeValue(field, handoff.text);
      field.focus();
      if (handoff.action) {
        const label = t(handoff.action).trim();
        // Let React commit the new value before clicking, so the action reads it.
        window.setTimeout(() => {
          const button = [...root.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === label);
          button?.click();
        }, 30);
      }
      setNotice(t("已帶入你在首頁貼上的內容。"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug, t]);
  return <span ref={anchor} className="handoff-anchor">{notice && <span className="handoff-notice" role="status">{notice}</span>}</span>;
}
