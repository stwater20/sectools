// Carries a pasted value or dropped file from the home page to a tool page during client-side navigation.
// It lives only in this tab's memory: nothing goes into the URL, storage or the network.

export type Handoff = { slug: string; text?: string; file?: File; action?: string };

let pending: Handoff | null = null;

export function setHandoff(handoff: Handoff) {
  pending = handoff;
}

export function takeHandoff(slug: string) {
  if (pending?.slug !== slug) return null;
  const handoff = pending;
  pending = null;
  return handoff;
}
