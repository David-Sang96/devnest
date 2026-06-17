import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JsonOutput } from "@/components/json/json-output";

describe("<JsonOutput />", () => {
  it("shows the 'output appears here' placeholder when value is empty", () => {
    render(<JsonOutput value="" />);
    expect(screen.getByText("output appears here")).toBeInTheDocument();
  });

  it("renders an 'Output' label", () => {
    render(<JsonOutput value="" />);
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("hides the placeholder when value is provided", () => {
    render(<JsonOutput value='{"a":1}' />);
    expect(screen.queryByText("output appears here")).not.toBeInTheDocument();
  });

  it("renders the JSON value inside a <pre> block", () => {
    render(<JsonOutput value='{"a":1}' />);
    expect(document.querySelector("pre")).toBeInTheDocument();
  });

  it("renders token spans for JSON keys", () => {
    render(<JsonOutput value='{"name":"Alice"}' />);
    // The key "name" should be wrapped in a span with class json-key
    const spans = document.querySelectorAll("span.json-key");
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].textContent).toBe('"name"');
  });

  it("renders token spans for string values", () => {
    render(<JsonOutput value='{"name":"Alice"}' />);
    const spans = document.querySelectorAll("span.json-string");
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].textContent).toBe('"Alice"');
  });

  it("renders number token spans", () => {
    render(<JsonOutput value='{"count":42}' />);
    const spans = document.querySelectorAll("span.json-number");
    expect(spans[0].textContent).toBe("42");
  });

  it("renders boolean token spans", () => {
    render(<JsonOutput value='{"ok":true}' />);
    const spans = document.querySelectorAll("span.json-bool");
    expect(spans[0].textContent).toBe("true");
  });

  it("renders null token spans", () => {
    render(<JsonOutput value='{"x":null}' />);
    const spans = document.querySelectorAll("span.json-null");
    expect(spans[0].textContent).toBe("null");
  });
});
