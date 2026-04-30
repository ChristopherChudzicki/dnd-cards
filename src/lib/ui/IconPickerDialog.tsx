import { listIcons } from "@iconify/react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  GridLayout,
  GridList,
  GridListItem,
  Heading,
  Input,
  Modal,
  ModalOverlay,
  Button as RACButton,
  SearchField,
  Size,
  Switch,
  Virtualizer,
} from "react-aria-components";
import { CURATED_ICONS } from "../../cards/curatedIcons";
import { ensureFullSet } from "../../cards/resolveIcon";
import { Button } from "./Button";
import styles from "./IconPickerDialog.module.css";
import { IconPreview } from "./IconPreview";

const AUTO_ID = "__auto__";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
};

export function IconPickerDialog({ value, onChange }: Props) {
  const triggerLabel = value ?? "Auto";
  return (
    <DialogTrigger>
      <RACButton className={styles.trigger} aria-label={`Pick icon (currently ${triggerLabel})`}>
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

function PickerBody({ onChange, onCancel }: BodyProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [fullSetKeys, setFullSetKeys] = useState<readonly string[] | null>(null);

  useEffect(() => {
    void ensureFullSet().then(() => {
      const all = listIcons("", "game-icons").map((n) => n.replace("game-icons:", ""));
      setFullSetKeys(all);
    });
  }, []);

  const dataset = showAll && fullSetKeys ? fullSetKeys : CURATED_ICONS;
  const filtered = search
    ? dataset.filter((k) => k.toLowerCase().includes(search.toLowerCase()))
    : dataset;

  const items: { id: string; label: string }[] = [
    { id: AUTO_ID, label: "Auto" },
    ...filtered.map((k) => ({ id: k, label: k })),
  ];

  return (
    <>
      <Heading slot="title">Pick an icon</Heading>
      <div className={styles.header}>
        <SearchField aria-label="Search icons" value={search} onChange={setSearch}>
          <Input className={styles.search} />
        </SearchField>
        <Switch isSelected={showAll} onChange={setShowAll} className={styles.switch}>
          <div className={styles.switchIndicator} />
          Show all
        </Switch>
      </div>
      <Virtualizer
        layout={GridLayout}
        layoutOptions={{
          minItemSize: new Size(60, 60),
          minSpace: new Size(8, 8),
          preserveAspectRatio: true,
        }}
      >
        <GridList
          aria-label="Icons"
          className={styles.grid}
          items={items}
          selectionMode="single"
          onAction={(key) => {
            const k = String(key);
            onChange(k === AUTO_ID ? undefined : k);
          }}
        >
          {(item) => (
            <GridListItem
              id={item.id}
              textValue={item.label}
              title={item.id === AUTO_ID ? undefined : item.label}
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
      <div className={styles.actions}>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}
