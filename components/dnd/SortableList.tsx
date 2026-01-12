
'use client';

import { useCallback } from 'react';
import SortableItem from './SortableItem';

interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  itemType?: string;
  className?: string;
}

export default function SortableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  itemType = 'SORTABLE_ITEM',
  className = ''
}: SortableListProps<T>) {
  
  const moveItem = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newItems = [...items];
      const [draggedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      onReorder(newItems);
    },
    [items, onReorder]
  );

  return (
    <div className={className}>
      {items.map((item, index) => (
        <SortableItem
          key={keyExtractor(item)}
          index={index}
          id={keyExtractor(item)}
          moveItem={moveItem}
          type={itemType}
        >
          {renderItem(item, index)}
        </SortableItem>
      ))}
    </div>
  );
}
