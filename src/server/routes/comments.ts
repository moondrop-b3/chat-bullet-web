import { Router } from "express";
import type { CommentPayload } from "../../shared/types";
import { state, persistComments, broadcast } from "../store";

const router = Router();

router.get("/", (_req, res) => {
  res.json(state.comments);
});

router.post("/", (req, res) => {
  const { author, text, color, size, pinPosition } = req.body;

  if (typeof author !== "string" || author.trim() === "") {
    res.status(400).json({ error: "author is required" });
    return;
  }
  if (typeof text !== "string" || text.trim() === "") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const safeAuthor = author.trim().slice(0, 25);
  const safeText = text.trim().slice(0, 250);
  const safeColor = typeof color === "string" ? color.slice(0, 20) : "#ffffff";
  const safeSize = size === "small" || size === "large" ? size : "medium";
  const safePin =
    pinPosition === "top" || pinPosition === "bottom" ? pinPosition : null;

  const comment: CommentPayload = {
    id: crypto.randomUUID(),
    author: safeAuthor,
    text: safeText,
    color: safeColor,
    size: safeSize,
    pinPosition: safePin,
    createdAt: Date.now(),
  };

  state.comments.push(comment);
  persistComments();
  broadcast({ type: "bullet", comment });
  res.status(201).json({ ok: true, comment });
});

export default router;
