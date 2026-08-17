// sanitizeRedirect 单元测试 — 防御 saas post-login 把字面量 "undefined"
// 拼到 URL 导致 lab 落到 /undefined 404 的 bug。

import { describe, it, expect } from "vitest";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";

describe("sanitizeRedirect", () => {
  describe("nullish / 字面量字符串 → 回退 /", () => {
    it("null → /", () => {
      expect(sanitizeRedirect(null)).toBe("/");
    });
    it("undefined → /", () => {
      expect(sanitizeRedirect(undefined)).toBe("/");
    });
    it("空串 → /", () => {
      expect(sanitizeRedirect("")).toBe("/");
    });
    it("字面量 'undefined'（saas 模板插值未传） → /", () => {
      expect(sanitizeRedirect("undefined")).toBe("/");
    });
    it("字面量 'null' → /", () => {
      expect(sanitizeRedirect("null")).toBe("/");
    });
  });

  describe("非法相对路径 / 外部 URL → 回退 /", () => {
    it("http://evil.com（外部 URL） → /", () => {
      expect(sanitizeRedirect("http://evil.com")).toBe("/");
    });
    it("https://evil.com（外部 URL） → /", () => {
      expect(sanitizeRedirect("https://evil.com")).toBe("/");
    });
    it("//evil.com（协议相对 URL） → /", () => {
      expect(sanitizeRedirect("//evil.com")).toBe("/");
    });
    it("//evil.com/data-entry（协议相对 + 路径） → /", () => {
      expect(sanitizeRedirect("//evil.com/data-entry")).toBe("/");
    });
    it("javascript:alert(1)（XSS 协议） → /", () => {
      expect(sanitizeRedirect("javascript:alert(1)")).toBe("/");
    });
    it("data:alert(1)（data 协议） → /", () => {
      expect(sanitizeRedirect("data:alert(1)")).toBe("/");
    });
  });

  describe("合法 lab 内部路径 → 原样透传", () => {
    it("/ → /", () => {
      expect(sanitizeRedirect("/")).toBe("/");
    });
    it("/data-entry → /data-entry", () => {
      expect(sanitizeRedirect("/data-entry")).toBe("/data-entry");
    });
    it("/receipts/12345（带 query string 子路径）→ 透传", () => {
      expect(sanitizeRedirect("/receipts/12345?from=detail")).toBe(
        "/receipts/12345?from=detail",
      );
    });
    it("/receipts/abc-def_123.456（合法字符）→ 透传", () => {
      expect(sanitizeRedirect("/receipts/abc-def_123.456")).toBe(
        "/receipts/abc-def_123.456",
      );
    });
    it("/dashboard?tab=contracts&page=2 → 透传", () => {
      expect(sanitizeRedirect("/dashboard?tab=contracts&page=2")).toBe(
        "/dashboard?tab=contracts&page=2",
      );
    });
  });
});