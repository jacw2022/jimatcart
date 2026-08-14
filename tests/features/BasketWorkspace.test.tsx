import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BasketWorkspace } from "../../src/features/basket/BasketWorkspace";

function addNamedShop(name: string) {
  const existingShops = screen.queryAllByLabelText(/Shop \d+ name/).length;

  fireEvent.click(
    screen.getByRole("button", {
      name: existingShops === 0 ? "Add your first shop" : "Add shop",
    }),
  );

  const input = screen.getByLabelText(`Shop ${existingShops + 1} name`);
  fireEvent.change(input, { target: { value: name } });
  return input;
}

describe("BasketWorkspace", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("waits for Compare before calculating the sample basket recommendation", () => {
    render(<BasketWorkspace />);

    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jasmine rice 5 kg")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /split between/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(screen.getByRole("heading", { name: /split between/i })).toBeInTheDocument();
    expect(screen.queryByText("Saved on this device.")).not.toBeInTheDocument();
    expect(screen.queryByText("Your recommendation is current.")).not.toBeInTheDocument();
    expect(screen.getByText(/additional petrol, fare, parking/i)).toBeInTheDocument();
  });

  it("keeps the native submitter enabled while the comparison is loading", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(screen.getByRole("button", { name: "Comparing basket" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: /split between/i })).toBeInTheDocument();
  });

  it("keeps shop headings inside their card and removes the grocery outer card", () => {
    render(<BasketWorkspace />);

    const shopHeading = screen.getByRole("heading", { name: "Shops to compare" });
    expect(shopHeading.closest("fieldset")).toHaveClass("shop-editor");

    const groceryHeading = screen.getByRole("heading", {
      name: "Grocery items and prices",
    });
    expect(groceryHeading.closest("section")).toHaveClass("items-editor");
    expect(groceryHeading.closest("section")).not.toHaveClass("editor-section");
  });

  it("adds, renames, and removes up to three shops", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    addNamedShop("NSK");
    addNamedShop("Mydin");

    expect(screen.getByLabelText("Shop 1 name")).toHaveValue("Lotus's");
    expect(screen.getByLabelText("Shop 2 name")).toHaveValue("NSK");
    expect(screen.getByLabelText("Shop 3 name")).toHaveValue("Mydin");
    expect(screen.getByRole("button", { name: "Add shop" })).toBeDisabled();
    expect(screen.getByText("Maximum of three shops reached.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove NSK" }));

    expect(screen.queryByDisplayValue("NSK")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add shop" })).toBeEnabled();
  });

  it("preserves item, quantity, and price strings while editing", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    addNamedShop("NSK");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    const itemName = screen.getByLabelText("Item 1 name");
    fireEvent.change(itemName, { target: { value: "Rice" } });

    const quantity = screen.getByLabelText("Rice quantity");
    fireEvent.change(quantity, { target: { value: "02" } });

    const lotusPrice = screen.getByLabelText("Rice price at Lotus's");
    fireEvent.change(lotusPrice, { target: { value: "18.5" } });

    expect(itemName).toHaveValue("Rice");
    expect(quantity).toHaveValue("02");
    expect(lotusPrice).toHaveValue("18.5");
    expect(screen.getByLabelText("Rice price at NSK")).toHaveValue("");
    expect(screen.getByText(/ready to compare/i)).toBeInTheDocument();
  });

  it("shows validation after leaving a field without rewriting the input", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Item 1 name"), {
      target: { value: "Rice" },
    });

    const price = screen.getByLabelText("Rice price at Lotus's");
    fireEvent.change(price, { target: { value: "5.555" } });
    fireEvent.blur(price);

    expect(price).toHaveValue("5.555");
    expect(price).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/no more than two decimal places/i)).toBeInTheDocument();
  });

  it("removes deleted-shop prices from every item", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    addNamedShop("NSK");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Item 1 name"), {
      target: { value: "Rice" },
    });
    fireEvent.change(screen.getByLabelText("Rice price at Lotus's"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Rice price at NSK"), {
      target: { value: "9" },
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove NSK" }));

    expect(screen.queryByLabelText("Rice price at NSK")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Rice price at Lotus's")).toHaveValue("10");
  });

  it("renders a semantic comparison table with repeated mobile labels", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    const table = screen.getByRole("table", {
      name: "Grocery item prices by shop",
    });
    expect(
      within(table).getByRole("columnheader", { name: /Lotus's/i }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Lotus's price (RM)")).toBeInTheDocument();
    expect(within(table).getByText("Item name")).toBeInTheDocument();
    expect(within(table).getByText("Quantity")).toBeInTheDocument();
  });

  it("removes an item using a fully labelled action", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Item 1 name"), {
      target: { value: "Rice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove Rice" }));

    expect(screen.queryByLabelText("Rice quantity")).not.toBeInTheDocument();
    expect(screen.getByText("Your basket has no items yet.")).toBeInTheDocument();
  });

  it("requires another comparison after valid input changes", () => {
    render(<BasketWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));

    addNamedShop("Lotus's");
    addNamedShop("NSK");

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Item 1 name"), {
      target: { value: "Rice" },
    });
    fireEvent.change(screen.getByLabelText("Rice price at Lotus's"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Rice price at NSK"), {
      target: { value: "2" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Item 2 name"), {
      target: { value: "Milk" },
    });
    fireEvent.change(screen.getByLabelText("Milk price at Lotus's"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Milk price at NSK"), {
      target: { value: "1" },
    });

    expect(screen.queryByRole("heading", { name: /split between/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(screen.getByRole("button", { name: "Comparing basket" })).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Split between Lotus's and NSK to save RM1.00",
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Additional cost (RM)"), {
      target: { value: "1.50" },
    });

    expect(
      screen.queryByRole("heading", {
        name: "Split between Lotus's and NSK to save RM1.00",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Complete your basket to see a recommendation",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(
      screen.getByRole("heading", {
        name: "Buy everything at NSK — splitting would cost RM0.50 more",
      }),
    ).toBeInTheDocument();
  });

  it("reveals the recommendation whenever a valid basket is explicitly compared", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("reveals blocking errors and focuses the first invalid field on compare", async () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));
    addNamedShop("Kedai Hijau");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    fireEvent.click(screen.getByRole("button", { name: "Compare my basket" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/fix 2 fields/i);
    await waitFor(() => expect(screen.getByLabelText("Item 1 name")).toHaveFocus());
  });

  it("normalises valid RM values on blur without changing invalid text", () => {
    render(<BasketWorkspace />);

    const ricePrice = screen.getByLabelText("Jasmine rice 5 kg price at Kedai Hijau");
    fireEvent.change(ricePrice, { target: { value: "19.5" } });
    fireEvent.blur(ricePrice);
    expect(ricePrice).toHaveValue("19.50");

    fireEvent.change(ricePrice, { target: { value: "19.555" } });
    fireEvent.blur(ricePrice);
    expect(ricePrice).toHaveValue("19.555");
  });

  it("asks before removing a shop that contains entered prices", () => {
    render(<BasketWorkspace />);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    fireEvent.click(screen.getByRole("button", { name: "Remove Kedai Hijau" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/discard its entered prices/i));
    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
  });

  it("can clear the sample after confirmation and restore it with reset", () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear basket" }));
    expect(screen.getByText("No shops added yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore sample" }));
    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
  });

  it("restores edited input after a refresh-equivalent remount", () => {
    const firstRender = render(<BasketWorkspace />);
    fireEvent.change(screen.getByLabelText("Additional cost (RM)"), {
      target: { value: "3.25" },
    });
    firstRender.unmount();

    render(<BasketWorkspace />);
    expect(screen.getByLabelText("Additional cost (RM)")).toHaveValue("3.25");
  });

  it("falls back safely when saved data is corrupted", () => {
    window.localStorage.setItem("jimatcart:basket:v1", "not-json");
    render(<BasketWorkspace />);

    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
    expect(screen.getByText(/could not be restored/i)).toBeInTheDocument();
  });

  it("keeps the basket when reset is cancelled", () => {
    render(<BasketWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Reset basket" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByDisplayValue("Kedai Hijau")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
