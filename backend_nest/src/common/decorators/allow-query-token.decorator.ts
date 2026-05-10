import { SetMetadata } from "@nestjs/common";

export const ALLOW_QUERY_TOKEN_KEY = "allowQueryToken";
export const AllowQueryToken = () => SetMetadata(ALLOW_QUERY_TOKEN_KEY, true);
