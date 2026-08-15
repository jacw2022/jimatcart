import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasketWorkspace } from "../../src/features/basket/BasketWorkspace";
import { GO_WELCOME_EVENT } from "../../src/features/basket/wizardEvents";
import { BASKET_STORAGE_KEY } from "../../src/storage/basketStorage";

function startWizard() {
  fireEvent.click(screen.getByRole("button", { name: "Start comparing" }));
}

function goToItems() {
  startWizard();
  fireEvent.click(screen.getByRole("button", { name: "Next: Items" }));
}

function goToTrips() {
  goToItems();
  fireEvent.click(screen.getByRole("button", { name: "Next: Trip costs" }));
}

function compareExampleBasket() {
  goToTrips();
  fireEvent.click(screen.getByRole("button", { name: "Compare total costs" }));
}

describe("BasketWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a clearly identified basic example", () => {
    render(<BasketWorkspace />);
    expect(screen.getByRole("heading", { name: "Make every ringgit count." })).toBeInTheDocument();
    goToItems();
    expect(screen.getByText(/Example basket loaded/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Jasmine rice quantity")).toHaveValue("1");
    expect(screen.getByLabelText("Jasmine rice price at Kedai Hijau")).toHaveValue("18.90");
    fireEvent.click(screen.getByRole("button", { name: "Next: Trip costs" }));
    expect(screen.getByLabelText("Trip cost for Kedai Hijau (RM)")).toHaveValue("1.00");
    expect(screen.getByLabelText("Trip cost for Kedai Hijau + Pasar Jimat (RM)")).toHaveValue("3.00");
  });

  it("compares the example and immediately invalidates the result after an edit", async () => {
    render(<BasketWorkspace />);
    compareExampleBasket();
    expect(await screen.findByText("What to buy where")).toBeInTheDocument();
    expect(screen.getByText("Final total")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Next: Items" }));
    fireEvent.change(screen.getByLabelText("Jasmine rice quantity"), {
      target: { value: "2" },
    });
    expect(screen.queryByText("What to buy where")).not.toBeInTheDocument();
  });

  it("requires at least one valid item price before continuing", async () => {
    render(<BasketWorkspace />);
    goToItems();
    const price = screen.getByLabelText("Grade B eggs price at Kedai Hijau");
    fireEvent.change(price, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Grade B eggs price at Pasar Jimat"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next: Trip costs" }));
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/Enter a price at one or more shops/i);
    expect(
      document.querySelectorAll('input[aria-invalid="true"]:not([aria-describedby])'),
    ).toHaveLength(0);
    await waitFor(() => {
      const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      expect(invalid).not.toBeNull();
      expect(invalid).toHaveFocus();
    });
  });

  it("starts empty and can restore the example through reset", () => {
    render(<BasketWorkspace />);
    startWizard();
    fireEvent.click(screen.getByRole("button", { name: "Start empty" }));
    expect(screen.getByText("No shops added yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    expect(screen.getByRole("heading", { name: "Restore the example basket?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    fireEvent.click(screen.getByRole("button", { name: "Next: Items" }));
    expect(screen.getByLabelText("Jasmine rice quantity")).toBeInTheDocument();
  });

  it("saves editable version-four data without persisting a recommendation", async () => {
    render(<BasketWorkspace />);
    goToItems();
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

  it("debounces localStorage writes across rapid keystrokes", async () => {
    render(<BasketWorkspace />);
    goToItems();
    await waitFor(() => {
      expect(localStorage.getItem(BASKET_STORAGE_KEY)).not.toBeNull();
    });

    const quantity = screen.getByLabelText("Jasmine rice quantity");
    for (const value of ["2", "23", "234"]) {
      fireEvent.change(quantity, { target: { value } });
    }

    expect(
      JSON.parse(localStorage.getItem(BASKET_STORAGE_KEY)!).draft.items[0]
        .quantityInput,
    ).toBe("1");

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(BASKET_STORAGE_KEY)!).draft.items[0]
          .quantityInput,
      ).toBe("234");
    });
  });

  it("confirms before clearing the complete basket", () => {
    render(<BasketWorkspace />);
    startWizard();
    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Clear this basket?" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear basket" }));
    expect(screen.getByText("No shops added yet.")).toBeInTheDocument();
  });

  it("confirms shop removal through the shared dialog", () => {
    render(<BasketWorkspace />);
    startWizard();
    fireEvent.click(screen.getByRole("button", { name: "Remove Kedai Hijau" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Remove this shop?" })).toBeInTheDocument();
    expect(within(dialog).getByText(/discards/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/trip cost/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
  });

  it("warns about trip costs when removing a shop with no prices left", () => {
    render(<BasketWorkspace />);
    goToItems();
    for (const name of [
      "Jasmine rice",
      "Cooking oil",
      "Grade B eggs",
      "Fresh milk",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: `Remove ${name}` }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Kedai Hijau" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/trip cost/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/discards/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/\d+ prices?/i)).not.toBeInTheDocument();
  });

  it("returns to welcome from the brand control", () => {
    render(<BasketWorkspace />);
    startWizard();
    expect(screen.getByRole("heading", { name: "Where do you shop?" })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event(GO_WELCOME_EVENT));
    });
    expect(
      screen.getByRole("heading", { name: "Make every ringgit count." }),
    ).toBeInTheDocument();
  });

  it("walks through each wizard step to results", async () => {
    render(<BasketWorkspace />);
    expect(screen.getByRole("button", { name: "Start comparing" })).toBeInTheDocument();
    compareExampleBasket();
    expect(await screen.findByText("What to buy where")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Basket comparison steps" })).toBeInTheDocument();
    expect(screen.getByText(/Step 5 of 5 · Results/i)).toBeInTheDocument();
  });

  it("shows a price error on blur and counts valid prices in the hint", () => {
    render(<BasketWorkspace />);
    goToItems();
    const price = screen.getByLabelText("Jasmine rice price at Kedai Hijau");
    fireEvent.change(price, { target: { value: "5.555" } });
    fireEvent.blur(price);
    expect(
      screen.getByText("Use at most two decimal places."),
    ).toBeInTheDocument();
    expect(screen.getByText(/need fixing/i)).toBeInTheDocument();
  });

  it("offers remove when an item is unavailable at every shop", async () => {
    render(<BasketWorkspace />);
    goToItems();
    const eggsKedai = screen.getByLabelText("Grade B eggs price at Kedai Hijau");
    const eggsPasar = screen.getByLabelText("Grade B eggs price at Pasar Jimat");
    const kedaiToggle = eggsKedai
      .closest(".shop-price")
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const pasarToggle = eggsPasar
      .closest(".shop-price")
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(kedaiToggle).not.toBeNull();
    expect(pasarToggle).not.toBeNull();
    fireEvent.click(kedaiToggle!);
    fireEvent.click(pasarToggle!);
    fireEvent.click(screen.getByRole("button", { name: "Next: Trip costs" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /No selected shop stocks Grade B eggs/i,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove this item" }));
    await waitFor(() => {
      expect(
        screen.queryByLabelText("Grade B eggs quantity"),
      ).not.toBeInTheDocument();
    });
  });
});
