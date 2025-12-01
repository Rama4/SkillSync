import RNFS from 'react-native-fs';
import {createNestedFolders, fileExists} from '../utils/fsUtils';

// Development data - embedded in the app bundle
const DEV_DATA = {
  'topics.json': {
    version: '1.0.0',
    lastUpdated: '2025-12-01',
    topics: [
      {
        id: 'deep-learning',
        title: 'Deep Learning',
        description:
          'Master the fundamentals and advanced concepts of deep learning, from neural networks to cutting-edge architectures.',
        icon: '🧠',
        color: '#8B5CF6',
        version: '1.0.0',
        lastUpdated: '2025-11-27',
        lessonCount: 3,
        totalDuration: '60 min',
        difficulty: 'intermediate' as const,
        tags: ['machine-learning', 'ai', 'neural-networks', 'python'],
      },
    ],
  },
  'deep-learning/topic.json': {
    id: 'deep-learning',
    title: 'Deep Learning',
    description:
      'Master the fundamentals and advanced concepts of deep learning, from neural networks to cutting-edge architectures.',
    icon: '🧠',
    color: '#8B5CF6',
    lessons: [
      {
        id: 'introduction-to-neural-networks',
        order: 1,
        title: 'Introduction to Neural Networks',
        duration: '15 min',
        difficulty: 'beginner' as const,
      },
      {
        id: 'backpropagation-explained',
        order: 2,
        title: 'Backpropagation Explained',
        duration: '20 min',
        difficulty: 'intermediate' as const,
      },
      {
        id: 'convolutional-neural-networks',
        order: 3,
        title: 'Convolutional Neural Networks (CNNs)',
        duration: '25 min',
        difficulty: 'intermediate' as const,
      },
    ],
    prerequisites: [],
    tags: ['machine-learning', 'ai', 'neural-networks', 'python'],
    lastUpdated: '2025-11-27',
  },
  'deep-learning/lessons/introduction-to-neural-networks.json': {
    id: 'introduction-to-neural-networks',
    title: 'Introduction to Neural Networks',
    topic: 'deep-learning',
    order: 1,
    duration: '15 min',
    difficulty: 'beginner' as const,
    objectives: [
      'Understand what neural networks are and how they work',
      'Learn the basic components: neurons, weights, and biases',
      'Explore different types of neural network architectures',
      'See real-world applications of neural networks',
    ],
    sections: [
      {
        id: 'what-are-neural-networks',
        type: 'content' as const,
        title: 'What are Neural Networks?',
        content: `**Neural networks** are computing systems inspired by biological neural networks. They're designed to recognize patterns and make decisions in a way that mimics how the human brain works.

### Key Components

1. **Neurons (Nodes)**: The basic processing units
2. **Connections (Edges)**: Links between neurons with weights
3. **Layers**: Groups of neurons organized in sequence
4. **Activation Functions**: Determine neuron output

### How They Work

Neural networks learn by adjusting the strength of connections between neurons based on training data. This process allows them to:
- Recognize patterns in data
- Make predictions
- Classify information
- Generate new content`,
      },
      {
        id: 'basic-architecture',
        type: 'content' as const,
        title: 'Basic Architecture',
        content: `### Layer Types

**Input Layer**
- Receives raw data
- One neuron per input feature
- No processing, just passes data forward

**Hidden Layer(s)**
- Process and transform data
- Can have multiple hidden layers (deep networks)
- Apply weights, biases, and activation functions

**Output Layer**
- Produces final predictions
- Number of neurons depends on task type
- Classification: one per class
- Regression: typically one neuron

### Information Flow

Data flows forward through the network:
\`\`\`
Input → Hidden Layer(s) → Output
\`\`\`

Each connection has a **weight** that determines its importance, and each neuron has a **bias** that shifts the activation threshold.`,
      },
    ],
    quiz: [
      {
        id: 'q1',
        type: 'multiple-choice' as const,
        question: 'What are the three main types of layers in a neural network?',
        options: [
          'Input, Hidden, Output',
          'Processing, Memory, Storage',
          'Forward, Backward, Lateral',
          'Linear, Nonlinear, Activation',
        ],
        correctAnswer: 0,
        explanation:
          'Neural networks consist of Input layers (receive data), Hidden layers (process data), and Output layers (produce results).',
      },
    ],
    keyTakeaways: [
      'Neural networks are inspired by biological brain structures',
      'They consist of interconnected neurons organized in layers',
      'Learning happens by adjusting connection weights',
      'Different architectures suit different types of problems',
    ],
    previousLesson: null,
    nextLesson: 'backpropagation-explained',
    resources: [
      {
        title: 'Neural Networks Explained',
        url: 'https://example.com/neural-networks',
        type: 'video' as const,
      },
    ],
    lastUpdated: '2025-11-27',
  },
  'deep-learning/lessons/backpropagation-explained.json': {
    id: 'backpropagation-explained',
    title: 'Backpropagation Explained',
    topic: 'deep-learning',
    order: 2,
    duration: '20 min',
    difficulty: 'intermediate' as const,
    objectives: [
      'Understand the intuition behind backpropagation',
      'Learn how gradients flow backward through the network',
      'Master the chain rule and its application in neural networks',
      'Implement a simple backpropagation example',
    ],
    sections: [
      {
        id: 'what-is-backprop',
        type: 'content' as const,
        title: 'What is Backpropagation?',
        content: `**Backpropagation** (short for "backward propagation of errors") is the algorithm that makes neural network training possible. It's how we figure out *which weights caused the error* and *by how much* we should adjust them.

### The Core Problem

Imagine a neural network with thousands of weights. When it makes a wrong prediction, we need to answer:
- Which weights contributed to the error?
- How much should each weight change?
- In which direction (increase or decrease)?

Backpropagation answers all these questions efficiently using **calculus** (specifically, the chain rule).

### The Key Insight

Backpropagation works because neural networks are just a series of mathematical operations chained together. If we know how the final error depends on each operation, we can trace backward to find how it depends on each weight.`,
      },
      {
        id: 'chain-rule',
        type: 'content' as const,
        title: 'The Chain Rule: The Heart of Backpropagation',
        content: `The **chain rule** from calculus is the mathematical foundation of backpropagation. It tells us how to compute the derivative of a composite function.

### Simple Chain Rule

If \`y = f(g(x))\`, then:
\`\`\`
dy/dx = (dy/dg) × (dg/dx)
\`\`\`

### In Neural Networks

A neural network is just nested functions:
\`\`\`
Loss = L(f₃(f₂(f₁(x))))
\`\`\`

Where each \`f\` is a layer. The chain rule lets us compute how the loss changes with respect to any weight in any layer:

\`\`\`
∂Loss/∂w₁ = (∂Loss/∂f₃) × (∂f₃/∂f₂) × (∂f₂/∂f₁) × (∂f₁/∂w₁)
\`\`\`

This is why it's called **backpropagation**—we propagate derivatives backward from the loss!`,
      },
    ],
    quiz: [
      {
        id: 'q1',
        type: 'multiple-choice' as const,
        question: 'What mathematical concept is the foundation of backpropagation?',
        options: [
          'Linear algebra',
          'The chain rule from calculus',
          'Probability theory',
          'Boolean algebra',
        ],
        correctAnswer: 1,
        explanation:
          'The chain rule allows us to compute how the loss changes with respect to any weight by decomposing the derivative through the network layers.',
      },
    ],
    keyTakeaways: [
      'Backpropagation computes how each weight affects the loss using the chain rule',
      'Gradients flow backward from the loss through each layer',
      'Positive gradients → decrease weight; Negative gradients → increase weight',
      'Common challenges: vanishing/exploding gradients, dead neurons',
    ],
    previousLesson: 'introduction-to-neural-networks',
    nextLesson: 'convolutional-neural-networks',
    resources: [
      {
        title: 'Calculus on Computational Graphs: Backpropagation',
        url: 'https://colah.github.io/posts/2015-08-Backprop/',
        type: 'article' as const,
      },
    ],
    lastUpdated: '2025-11-27',
  },
  'deep-learning/lessons/convolutional-neural-networks.json': {
    id: 'convolutional-neural-networks',
    title: 'Convolutional Neural Networks (CNNs)',
    topic: 'deep-learning',
    order: 3,
    duration: '25 min',
    difficulty: 'intermediate' as const,
    objectives: [
      'Understand what makes CNNs special for image processing',
      'Learn about convolution operations and filters',
      'Explore pooling layers and their purposes',
      'See CNN architectures in action',
    ],
    sections: [
      {
        id: 'what-are-cnns',
        type: 'content' as const,
        title: 'What are CNNs?',
        content: `**Convolutional Neural Networks (CNNs)** are specialized neural networks designed for processing grid-like data, especially images. They're inspired by the visual cortex and excel at recognizing patterns, shapes, and features in visual data.

### Why CNNs for Images?

Regular neural networks treat images as flat vectors, losing spatial relationships. CNNs preserve spatial structure by:
- **Local connectivity**: Each neuron connects to a small region
- **Parameter sharing**: Same filter used across the entire image
- **Translation invariance**: Detect features regardless of position

### Key Advantages

1. **Fewer parameters** than fully connected networks
2. **Spatial hierarchy** - learn from simple to complex features
3. **Translation invariant** - recognize objects anywhere in image
4. **Computationally efficient** for image processing`,
      },
      {
        id: 'convolution-operation',
        type: 'content' as const,
        title: 'Convolution Operation',
        content: `### How Convolution Works

A **convolution** applies a small matrix (filter/kernel) across an input image:

1. **Slide the filter** over the input
2. **Element-wise multiply** filter values with input values
3. **Sum the results** to get one output value
4. **Repeat** for all positions

### Example: Edge Detection Filter

\`\`\`
Filter:     Input:      Output:
[-1  0  1]  [1 2 3]     [2]
[-1  0  1]  [4 5 6]  →  [2]
[-1  0  1]  [7 8 9]     [2]
\`\`\`

This vertical edge detection filter highlights vertical changes in intensity.

### Multiple Filters

CNNs use many filters to detect different features:
- **Edges** (horizontal, vertical, diagonal)
- **Textures** (smooth, rough, patterns)
- **Shapes** (circles, rectangles)
- **Complex patterns** (eyes, wheels, etc.)`,
      },
    ],
    quiz: [
      {
        id: 'q1',
        type: 'multiple-choice' as const,
        question: 'What is the main advantage of CNNs over regular neural networks for image processing?',
        options: [
          'They have more parameters',
          'They preserve spatial relationships in images',
          'They are faster to train',
          'They use less memory',
        ],
        correctAnswer: 1,
        explanation:
          'CNNs preserve spatial relationships through local connectivity and parameter sharing, making them ideal for image processing tasks.',
      },
    ],
    keyTakeaways: [
      'CNNs are specialized for grid-like data, especially images',
      'Convolution operations detect local features using filters',
      'Parameter sharing reduces overfitting and computational cost',
      'Spatial hierarchy allows learning from simple to complex features',
    ],
    previousLesson: 'backpropagation-explained',
    nextLesson: null,
    resources: [
      {
        title: 'CS231n: Convolutional Neural Networks',
        url: 'https://cs231n.github.io/convolutional-networks/',
        type: 'article' as const,
      },
    ],
    lastUpdated: '2025-11-27',
  },
};

class DevDataService {
  async copyDevDataToDevice(targetPath: string): Promise<void> {
    console.log('🔧 Development Mode: Copying data to device...');

    try {
      // Ensure target directory exists
      await createNestedFolders(targetPath);

      // Copy each file from DEV_DATA
      for (const [relativePath, content] of Object.entries(DEV_DATA)) {
        const fullPath = `${targetPath}/${relativePath}`;
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

        // Create directory if needed
        await createNestedFolders(dirPath);

        // Write file
        await RNFS.writeFile(fullPath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`📄 Copied: ${relativePath}`);
      }

      console.log('✅ Development data copied successfully!');
    } catch (error) {
      console.error('❌ Failed to copy development data:', error);
      throw error;
    }
  }

  async shouldCopyDevData(targetPath: string): Promise<boolean> {
    try {
      // Check if topics.json exists
      const topicsPath = `${targetPath}/topics.json`;
      const exists = await fileExists(topicsPath);

      if (!exists) {
        console.log('📋 No topics.json found, will copy dev data');
        return true;
      }

      // Check if it's our dev data (has version 1.0.0)
      const content = await RNFS.readFile(topicsPath, 'utf8');
      const data = JSON.parse(content);

      if (data.version === '1.0.0' && data.topics?.length === 1) {
        console.log('📋 Dev data already present, skipping copy');
        return false;
      }

      console.log('📋 Different data found, will update with dev data');
      return true;
    } catch (error) {
      console.log('📋 Error checking existing data, will copy dev data');
      return true;
    }
  }

  async ensureDevDataExists(targetPath: string): Promise<void> {
    const shouldCopy = await this.shouldCopyDevData(targetPath);

    if (shouldCopy) {
      await this.copyDevDataToDevice(targetPath);
    }
  }
}

export const devDataService = new DevDataService();
