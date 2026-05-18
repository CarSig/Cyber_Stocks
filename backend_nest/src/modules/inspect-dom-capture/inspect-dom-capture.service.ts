import { Injectable } from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { CoreDbService } from "@/shared/core-db.service";
import { AppError } from "@/shared/errors";
import type { FeedbackPayload, FeedbackStatus, ReviewPayload } from "./inspect-dom-capture.dto";

export type FeedbackRow = {
  id: string;
  message: string;
  tag_name: string;
  element_id: string;
  classes: string[];
  css_selector: string;
  dom_path: string[];
  inner_text: string;
  page_url: string;
  bounding_rect: Record<string, number>;
  submitted_by: string;
  status: FeedbackStatus;
  dev_comment: string | null;
  ai_comment: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class InspectDomCaptureService {
  constructor(
    @InjectPinoLogger(InspectDomCaptureService.name)
    private readonly logger: PinoLogger,
    private readonly db: CoreDbService,
  ) {}

  async save(payload: FeedbackPayload, submittedBy: string): Promise<void> {
    const { message, metadata: m } = payload;
    await this.db.pool.query(
      `INSERT INTO dom_feedback
         (message, tag_name, element_id, classes, css_selector, dom_path,
          inner_text, page_url, bounding_rect, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        message,
        m.tagName,
        m.id,
        m.classes,
        m.cssSelector,
        m.domPath,
        m.innerTextPreview,
        m.pageUrl,
        JSON.stringify(m.boundingRect),
        submittedBy,
      ],
    );
    this.logger.info({ pageUrl: m.pageUrl, element: m.cssSelector, submittedBy }, "dom-feedback saved");
  }

  async list(limit: number, offset: number, status?: FeedbackStatus): Promise<{ total: number; entries: FeedbackRow[] }> {
    const params: unknown[] = [];

    if (status) params.push(status);
    const where = status ? `WHERE status = $1` : "";

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const res = await this.db.pool.query<FeedbackRow & { total: string }>(
      `SELECT *, COUNT(*) OVER() AS total
       FROM dom_feedback ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    return { total: res.rows[0] ? parseInt(res.rows[0].total, 10) : 0, entries: res.rows };
  }

  async review(id: string, payload: ReviewPayload): Promise<FeedbackRow> {
    const res = await this.db.pool.query<FeedbackRow>(
      `UPDATE dom_feedback
       SET status = $1, dev_comment = $2, ai_comment = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [payload.status, payload.dev_comment ?? null, payload.ai_comment ?? null, id],
    );
    if (!res.rows[0]) throw new AppError("Feedback not found", 404);
    return res.rows[0];
  }
}
