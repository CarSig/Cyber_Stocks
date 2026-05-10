import { Controller, Get, Param, Query } from "@nestjs/common";
import { RedditService, SUBREDDITS, type Subreddit } from "./reddit.service";
import { AppError } from "@/shared/errors";

@Controller()
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  @Get("reddit-posts")
  getPosts(@Query("subreddit") subreddit: string) {
    const sub = (subreddit ?? "ExperiencedDevs") as Subreddit;
    if (!SUBREDDITS.includes(sub)) {
      throw new AppError(`Unknown subreddit. Valid: ${SUBREDDITS.join(", ")}`, 400);
    }
    return this.redditService.getPosts(sub);
  }

  @Get("reddit-comments/:subreddit/:id")
  async getComments(@Param("subreddit") subreddit: string, @Param("id") id: string) {
    if (!subreddit || !id) throw new AppError("Missing subreddit or id", 400);
    return this.redditService.getComments(subreddit, id);
  }
}
