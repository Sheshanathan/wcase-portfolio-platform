export const TOUR_VIEWPORT_MARGIN = 12;
const CARD_GAP = 16;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

function candidatePosition(placement, target, card) {
    const centeredTop = target.top + (target.height - card.height) / 2;
    const centeredLeft = target.left + (target.width - card.width) / 2;
    if (placement === "right") return { placement, top: centeredTop, left: target.right + CARD_GAP };
    if (placement === "left") return { placement, top: centeredTop, left: target.left - card.width - CARD_GAP };
    if (placement === "top") return { placement, top: target.top - card.height - CARD_GAP, left: centeredLeft };
    return { placement: "bottom", top: target.bottom + CARD_GAP, left: centeredLeft };
}

export function calculateTourPosition(target, card, preferredPlacement, viewport) {
    const placements = [preferredPlacement, "right", "left", "bottom", "top"].filter((value, index, values) => values.indexOf(value) === index);
    const candidates = placements.map((placement) => candidatePosition(placement, target, card));
    const fitting = candidates.find(({ top, left }) => (
        top >= TOUR_VIEWPORT_MARGIN &&
        left >= TOUR_VIEWPORT_MARGIN &&
        top + card.height <= viewport.height - TOUR_VIEWPORT_MARGIN &&
        left + card.width <= viewport.width - TOUR_VIEWPORT_MARGIN
    ));
    const selected = fitting || candidates[0];
    return {
        placement: selected.placement,
        top: clamp(selected.top, TOUR_VIEWPORT_MARGIN, viewport.height - card.height - TOUR_VIEWPORT_MARGIN),
        left: clamp(selected.left, TOUR_VIEWPORT_MARGIN, viewport.width - card.width - TOUR_VIEWPORT_MARGIN)
    };
}
