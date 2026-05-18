import { z } from "zod";

const BoundingRectSchema = z.object({
  top: z.number(),
  left: z.number(),
  bottom: z.number(),
  right: z.number(),
  width: z.number(),
  height: z.number(),
});

const ElementMetadataSchema = z.object({
  tagName: z.string(),
  id: z.string(),
  classes: z.array(z.string()),
  innerTextPreview: z.string(),
  cssSelector: z.string(),
  domPath: z.array(z.string()),
  pageUrl: z.string().url(),
  timestamp: z.string().datetime(),
  screenshotPlaceholder: z.null(),
  boundingRect: BoundingRectSchema,
});

export const FeedbackPayloadSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000),
  metadata: ElementMetadataSchema,
});

export const FEEDBACK_STATUSES = ["pending", "approved", "rejected", "implemented", "failed"] as const;
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number];

export const ReviewPayloadSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
  dev_comment: z.string().max(2000).optional(),
  ai_comment: z.string().max(600).optional(),
});

export type FeedbackPayload = z.infer<typeof FeedbackPayloadSchema>;
export type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;
