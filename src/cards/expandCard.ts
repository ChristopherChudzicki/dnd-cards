import { paginateBody } from "./paginate";
import type { CardMeasurer } from "./measurer";
import type { ItemCard } from "./types";
import type { CardPagination } from "./Card";

export type PhysicalCard = {
	card: ItemCard;
	bodyChunk: string;
	pagination?: CardPagination;
	needsScaleFit: boolean;
};

export function expandCard(card: ItemCard, measurer: CardMeasurer): PhysicalCard[] {
	const chunks = paginateBody({
		body: card.body,
		measureFirst: (s) => measurer.measureFirst(card, s),
		measureContinuation: (s) => measurer.measureContinuation(card, s),
	});

	const total = chunks.length;
	return chunks.map((bodyChunk, i) => ({
		card,
		bodyChunk,
		pagination: total > 1 ? { page: i + 1, total } : undefined,
		needsScaleFit: total === 1,
	}));
}
