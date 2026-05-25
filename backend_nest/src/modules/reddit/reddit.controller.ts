import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { RedditService, SUBREDDITS, type Subreddit } from "./reddit.service";
import { AppError } from "@/shared/errors";

@ApiTags("Reddit")
@Controller("reddit")
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  @Get("posts")
  @ApiOperation({ summary: "List subreddit posts" })
  @ApiQuery({ name: "subreddit", required: false, description: `One of: ${SUBREDDITS.join(", ")}` })
  @ApiResponse({ status: 200, description: "Array of Reddit posts" })
  @ApiResponse({ status: 400, description: "Unknown subreddit" })
  async getPosts(@Query("subreddit") subreddit: string) {
    const sub = (subreddit ?? "ExperiencedDevs") as Subreddit;
    if (!SUBREDDITS.includes(sub)) {
      throw new AppError(`Unknown subreddit. Valid: ${SUBREDDITS.join(", ")}`, 400);
    }
    return this.redditService.getPosts(sub);
  }

  @Get("comments/:subreddit/:id")
  @ApiOperation({ summary: "Get post comments" })
  @ApiParam({ name: "subreddit", description: "Subreddit name" })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Array of Reddit comments" })
  async getComments(@Param("subreddit") subreddit: string, @Param("id") id: string) {
    if (!subreddit || !id) throw new AppError("Missing subreddit or id", 400);
    return this.redditService.getComments(subreddit, id);
  }
}
