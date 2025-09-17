import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

const DropZone = ({ 
  children, 
  onDropAccepted,
  style,
  dropData,
  isValidTarget = () => true 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDrop = (draggedCard, dropPosition) => {
    if (isValidTarget(draggedCard, dropData)) {
      onDropAccepted(draggedCard, dropData, dropPosition);
    }
  };

  return (
    <View 
      style={[
        style, 
        isHovered && styles.highlighted
      ]}
      onLayout={(event) => {
        // Store layout info for drop zone detection
        const { x, y, width, height } = event.nativeEvent.layout;
        if (dropData) {
          dropData.layout = { x, y, width, height };
        }
      }}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  highlighted: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
});

export default DropZone;