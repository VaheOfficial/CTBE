import type { Request, Response } from "express";

declare module "express" {
  interface RequestWithUser extends Request {
    user: {
      userId: string;
      email: string;
      role: string;
    }
  }
}


