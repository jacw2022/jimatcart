import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BasketWorkspace } from "../../src/features/basket/BasketWorkspace";
import { BASKET_STORAGE_KEY } from "../../src/storage/basketStorage";

describe("BasketWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads a clearly identified basic example", () => {
    render(<BasketWorkspace />);
    expect(screen.getByText(/Example basket loaded/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Jasmine rice quantity")).toHaveValue("1");
    expect(screen.getByLabelText("Jasmine rice price at Kedai Hijau")).toHaveValue("18.90");
    expect(screen.getByLabelText("Total trip cost for Kedai Hijau (RM)")).toHaveValue("1.00");
    expect(screen.getByLabelText("Total trip cost for Kedai Hijau and Pasar Jimat (RM)")).toHaveValue("3.00");
  });

  it("compares the example and immediately invalidates the result after an edit", async () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));
    expect(await screen.findByText("What to buy where")).toBeInTheDocument();
    expect(screen.getByText("Estimated travel")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Jasmine rice quantity"), {
      target: { value: "2" },
    });
    expect(screen.queryByText("What to buy where")).not.toBeInTheDocument();
  });

  it("requires at least one valid item price", async () => {
    render(<BasketWorkspace />);
    const price = screen.getByLabelText("Grade B eggs price at Kedai Hijau");
    fireEvent.change(price, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Grade B eggs price at Pasar Jimat"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));
    expect(screen.getByText("Enter a price at one or more shops.")).toBeInTheDocument();
    await waitFor(() => expect(price).toHaveFocus());
  });

  it("starts empty and can restore the example through reset", () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Start empty" }));
    expect(screen.getByText("No shops added yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    expect(screen.getByRole("heading", { name: "Restore the example basket?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    expect(screen.getByLabelText("Jasmine rice quantity")).toBeInTheDocument();
  });

  it("saves editable version-four data without persisting a recommendation", async () => {
    render(<BasketWorkspace />);
    fireEvent.change(screen.getByLabelText("Jasmine rice quantity"), {
      target: { value: "5" },
    });
    await waitFor(() => {
      const raw = localStorage.getItem(BASKET_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      expect(stored.version).toBe(4);
      expect(stored.draft.items[0].quantityInput).toBe("5");
      expect(raw).not.toMatch(/recommendation/i);
    });
  });

  it("confirms before clearing the complete basket", () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "Clear this basket?" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear basket" }));
    expect(screen.getByText("No shops added yet.")).toBeInTheDocument();
  });
});
