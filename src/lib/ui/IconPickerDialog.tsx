import { listIcons } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  GridLayout,
  GridList,
  GridListItem,
  Heading,
  Modal,
  ModalOverlay,
  Button as RACButton,
  SearchField,
  Size,
  Switch,
  Virtualizer,
} from "react-aria-components";
import { Input } from "./Input";
import { CURATED_ICONS } from "../../cards/curatedIcons";
import { ensureFullSet } from "../../cards/resolveIcon";
import { Button } from "./Button";
import styles from "./IconPickerDialog.module.css";
import { IconPreview } from "./IconPreview";

const AUTO_ID = "__auto__";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  id?: string;
};

export function IconPickerDialog({ value, onChange, id }: Props) {
  const triggerLabel = value ?? "Auto";
  return (
    <DialogTrigger>
      <RACButton
        id={id}
        className={styles.trigger}
        aria-label={`Pick icon (currently ${triggerLabel})`}
      >
        {triggerLabel} ▾
      </RACButton>
      <ModalOverlay className={styles.modalOverlay} isDismissable>
        <Modal>
          <Dialog className={styles.dialog}>
            {({ close }) => (
              <PickerBody
                onChange={(next) => {
                  onChange(next);
                  close();
                }}
                onCancel={close}
              />
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

type BodyProps = {
  onChange: (next: string | undefined) => void;
  onCancel: () => void;
};

type Hovered = { label: string; top: number; left: number };

function PickerBody({ onChange, onCancel }: BodyProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [fullSetKeys, setFullSetKeys] = useState<readonly string[] | null>(null);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const resetScroll = () => {
    if (gridRef.current) gridRef.current.scrollTop = 0;
  };
  const handleSearchChange = (next: string) => {
    setSearch(next);
    resetScroll();
  };
  const handleShowAllChange = (next: boolean) => {
    setShowAll(next);
    resetScroll();
  };

  // Event delegation: RAC's GridListItem doesn't forward onMouseEnter, so a
  // single handler on the wrapper walks up to find the tile via RAC's own
  // data-key attribute. Same handler runs for mouse hover and keyboard focus.
  const handleTileActivate = (e: { target: EventTarget | null }) => {
    const tile = (e.target as HTMLElement).closest?.<HTMLElement>("[data-key]");
    if (!tile) return;
    const label = tile.getAttribute("data-key");
    if (!label || label === AUTO_ID) {
      setHovered(null);
      return;
    }
    const rect = tile.getBoundingClientRect();
    setHovered({ label, top: rect.top, left: rect.left + rect.width / 2 });
  };
  const handleGridLeave = () => setHovered(null);

  useEffect(() => {
    void ensureFullSet().then(() => {
      const all = listIcons("", "game-icons").map((n) => n.replace("game-icons:", ""));
      setFullSetKeys(all);
    });
  }, []);

  const dataset = useMemo(
    () => (showAll && fullSetKeys ? fullSetKeys : CURATED_ICONS),
    [showAll, fullSetKeys],
  );
  const filtered = useMemo(() => {
    if (!search) return dataset;
    const q = search.toLowerCase();
    return dataset.filter((k) => k.toLowerCase().includes(q));
  }, [dataset, search]);
  const items = useMemo<{ id: string; label: string }[]>(
    () => [{ id: AUTO_ID, label: "Auto" }, ...filtered.map((k) => ({ id: k, label: k }))],
    [filtered],
  );

  const layoutOptions = useMemo(
    () => ({
      minItemSize: new Size(60, 60),
      minSpace: new Size(8, 8),
      preserveAspectRatio: true,
    }),
    [],
  );

  const handleAction = useCallback(
    (key: React.Key) => {
      const k = String(key);
      onChange(k === AUTO_ID ? undefined : k);
    },
    [onChange],
  );

  return (
    <>
      <Heading slot="title">Pick an icon</Heading>
      <div className={styles.header}>
        <SearchField aria-label="Search icons" value={search} onChange={handleSearchChange}>
          <Input className={styles.searchSlot} />
        </SearchField>
        <Switch isSelected={showAll} onChange={handleShowAllChange} className={styles.switch}>
          <div className={styles.switchIndicator} />
          Show all
        </Switch>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Event delegation for tile tooltip; display:contents removes the wrapper from layout entirely. */}
      <div
        className={styles.tooltipDelegationWrapper}
        onMouseOver={handleTileActivate}
        onMouseLeave={handleGridLeave}
        onFocus={handleTileActivate}
        onBlur={handleGridLeave}
      >
        <Virtualizer layout={GridLayout} layoutOptions={layoutOptions}>
          <GridList
            ref={gridRef}
            aria-label="Icons"
            className={styles.grid}
            items={items}
            layout="grid"
            selectionMode="single"
            onAction={handleAction}
          >
            {(item) => (
              <GridListItem
                id={item.id}
                textValue={item.label}
                className={`${styles.tile} ${item.id === AUTO_ID ? styles.autoTile : ""}`}
              >
                {item.id === AUTO_ID ? (
                  "Auto"
                ) : (
                  <IconPreview iconKey={item.id} label={item.label} size="lg" />
                )}
              </GridListItem>
            )}
          </GridList>
        </Virtualizer>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      {hovered && (
        <div
          role="tooltip"
          className={styles.tooltip}
          style={{ top: hovered.top, left: hovered.left }}
        >
          {hovered.label}
        </div>
      )}
    </>
  );
}
