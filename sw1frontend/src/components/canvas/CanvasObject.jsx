import React from 'react';
import { Rect, Text, Image as KonvaImage } from 'react-konva';

/**
 * Renderiza un componente específico en el canvas
 */
const CanvasObject = ({ component, isSelected, isPreview, onSelect, onDragMove, onTransform }) => {
  const { id, type, x, y, width, height, props } = component;
  
  const commonProps = {
    id,
    x,
    y,
    width,
    height,
    draggable: !isPreview,
    onClick: (e) => {
      if (!isPreview) {
        e.cancelBubble = true;
        onSelect(id);
      }
    },
    onDragMove: (e) => !isPreview && onDragMove(e, id),
    onTransformEnd: (e) => !isPreview && onTransform(e, id),
    stroke: isSelected && !isPreview ? "blue" : undefined,
    strokeWidth: isSelected && !isPreview ? 2 : undefined,
  };

  switch (type) {
    case 'text':
      return (
        <Text
          {...commonProps}
          text={props.text}
          fontSize={props.fontSize}
          fontFamily={props.fontFamily}
          fill={props.fill}
          align={props.align}
        />
      );
    case 'button':
      return (
        <>
          <Rect
            {...commonProps}
            fill={props.fill}
            cornerRadius={props.cornerRadius}
          />
          <Text
            x={x + 10}
            y={y + (height / 2) - (props.fontSize / 2)}
            text={props.text}
            fill={props.textColor}
            fontSize={props.fontSize}
            fontFamily={props.fontFamily}
            onClick={(e) => {
              if (!isPreview) {
                e.cancelBubble = true;
                onSelect(id);
              }
            }}
          />
        </>
      );
    case 'input':
      return (
        <>
          <Rect
            {...commonProps}
            fill={props.fill}
            stroke={props.stroke}
            cornerRadius={props.cornerRadius}
          />
          <Text
            x={x + 10}
            y={y + (height / 2) - (props.fontSize / 2)}
            text={props.placeholder}
            fill={props.placeholderColor}
            fontSize={props.fontSize}
            fontFamily={props.fontFamily}
            onClick={(e) => {
              if (!isPreview) {
                e.cancelBubble = true;
                onSelect(id);
              }
            }}
          />
        </>
      );
    case 'rectangle':
      return (
        <Rect
          {...commonProps}
          fill={props.fill}
          stroke={props.stroke}
          strokeWidth={props.strokeWidth}
          cornerRadius={props.cornerRadius}
          opacity={props.opacity}
        />
      );
    case 'image':
      return (
        <KonvaImage
          {...commonProps}
          src={props.src}
          cornerRadius={props.cornerRadius}
          opacity={props.opacity}
        />
      );
    default:
      return null;
  }
};

export default CanvasObject;