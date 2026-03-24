const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

const IMAGE_HEIGHT = 64;
const IMAGE_WIDTH = 256;
const NUM_DRUG_CLASSES = 50;
const NUM_DOSAGE_CLASSES = 20;

const COMMON_DRUGS = [
  'Metformin', 'Amlodipine', 'Omeprazole', 'Atorvastatin', 'Losartan',
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Cetirizine', 'Pantoprazole',
  'Ranitidine', 'Salbutamol', 'Montelukast', 'Metoprolol', 'Ramipril',
  'Telmisartan', 'Rosuvastatin', 'Gliclazide', 'Glimepiride', 'Enalapril'
];

const COMMON_DOSAGES = [
  '500mg', '1000mg', '5mg', '10mg', '20mg', '40mg', '50mg', '100mg',
  '200mg', '400mg', '650mg', '75mg', '150mg', '25mg', '12.5mg',
  '0.5mg', '1mg', '2mg', '0.25mg', '100mcg'
];

const DRUG_TO_INDEX = {};
const DOSAGE_TO_INDEX = {};

COMMON_DRUGS.forEach((drug, idx) => DRUG_TO_INDEX[drug.toLowerCase()] = idx);
COMMON_DOSAGES.forEach((dose, idx) => DOSAGE_TO_INDEX[dose] = idx);

function buildCRNNModel() {
  const model = tf.sequential();
  
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_HEIGHT, IMAGE_WIDTH, 1],
    filters: 64,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  model.add(tf.layers.conv2d({
    filters: 128,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  model.add(tf.layers.conv2d({
    filters: 256,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.conv2d({
    filters: 256,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 1] }));
  
  model.add(tf.layers.conv2d({
    filters: 512,
    kernelSize: [3, 3],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 1] }));
  
  model.add(tf.layers.conv2d({
    filters: 512,
    kernelSize: [2, 2],
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal'
  }));
  
  const reshapeOutput = model.outputShape;
  const newLength = reshapeOutput[1] * 512;
  
  model.add(tf.layers.reshape({
    targetShape: [reshapeOutput[1], newLength / reshapeOutput[1]]
  }));
  
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({
      units: 256,
      returnSequences: true,
      dropout: 0.3
    }),
    mergeMode: 'concat'
  }));
  
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({
      units: 128,
      returnSequences: false,
      dropout: 0.3
    }),
    mergeMode: 'concat'
  }));
  
  model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.4 }));
  
  const drugOutput = tf.layers.dense({
    units: NUM_DRUG_CLASSES + 1,
    activation: 'softmax',
    name: 'drug_output'
  }).apply(model.output);
  
  const dosageOutput = tf.layers.dense({
    units: NUM_DOSAGE_CLASSES + 1,
    activation: 'softmax',
    name: 'dosage_output'
  }).apply(model.output);
  
  const frequencyOutput = tf.layers.dense({
    units: 100,
    activation: 'softmax',
    name: 'frequency_output'
  }).apply(model.output);
  
  const multiOutputModel = tf.model({
    inputs: model.input,
    outputs: [drugOutput, dosageOutput, frequencyOutput]
  });
  
  multiOutputModel.compile({
    optimizer: tf.train.adam(0.0005),
    loss: {
      drug_output: 'categoricalCrossentropy',
      dosage_output: 'categoricalCrossentropy',
      frequency_output: 'categoricalCrossentropy'
    },
    lossWeights: {
      drug_output: 1.0,
      dosage_output: 0.8,
      frequency_output: 0.5
    },
    metrics: ['accuracy']
  });
  
  return multiOutputModel;
}

function generateSyntheticBatch(batchSize) {
  const batchX = [];
  const batchDrugY = [];
  const batchDosageY = [];
  const batchFreqY = [];
  
  for (let i = 0; i < batchSize; i++) {
    const img = tf.randomNormal([IMAGE_HEIGHT, IMAGE_WIDTH, 1]);
    batchX.push(img);
    
    const drugIdx = Math.floor(Math.random() * COMMON_DRUGS.length);
    const dosageIdx = Math.floor(Math.random() * COMMON_DOSAGES.length);
    const freqIdx = Math.floor(Math.random() * 100);
    
    const drugY = tf.oneHot(tf.tensor1d([drugIdx], 'int32'), NUM_DRUG_CLASSES + 1);
    const dosageY = tf.oneHot(tf.tensor1d([dosageIdx], 'int32'), NUM_DOSAGE_CLASSES + 1);
    const freqY = tf.oneHot(tf.tensor1d([freqIdx], 'int32'), 100);
    
    batchDrugY.push(drugY);
    batchDosageY.push(dosageY);
    batchFreqY.push(freqY);
  }
  
  return {
    xs: tf.concat(batchX, 0),
    drugYs: tf.concat(batchDrugY, 0),
    dosageYs: tf.concat(batchDosageY, 0),
    freqYs: tf.concat(batchFreqY, 0)
  };
}

async function train() {
  console.log('Building CRNN model for prescription OCR...');
  
  const model = buildCRNNModel();
  console.log('Model built successfully');
  
  console.log('Starting training with synthetic data...');
  const epochs = 20;
  const batchSize = 32;
  const batchesPerEpoch = 50;
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = { drug_output: 0, dosage_output: 0, frequency_output: 0 };
    
    for (let batch = 0; batch < batchesPerEpoch; batch++) {
      const { xs, drugYs, dosageYs, freqYs } = generateSyntheticBatch(batchSize);
      
      const result = await model.trainOnBatch(xs, {
        drug_output: drugYs,
        dosage_output: dosageYs,
        frequency_output: freqYs
      });
      
      if (typeof result === 'object') {
        epochLoss.drug_output += result.drug_output || 0;
        epochLoss.dosage_output += result.dosage_output || 0;
        epochLoss.frequency_output += result.frequency_output || 0;
      } else {
        epochLoss.drug_output += result || 0;
      }
      
      tf.dispose([xs, drugYs, dosageYs, freqYs]);
    }
    
    console.log(
      `Epoch ${epoch + 1}/${epochs} - ` +
      `drug_loss: ${(epochLoss.drug_output / batchesPerEpoch).toFixed(4)} - ` +
      `dosage_loss: ${(epochLoss.dosage_output / batchesPerEpoch).toFixed(4)}`
    );
    
    if ((epoch + 1) % 5 === 0) {
      const savePath = path.join(__dirname, '..', 'output', `model_epoch_${epoch + 1}`);
      fs.mkdirSync(savePath, { recursive: true });
      await model.save(`file://${savePath}`);
      console.log(`Model checkpoint saved at epoch ${epoch + 1}`);
    }
  }
  
  console.log('Training complete!');
  
  const finalPath = path.join(__dirname, '..', 'output', 'prescription-ocr');
  fs.mkdirSync(finalPath, { recursive: true });
  await model.save(`file://${finalPath}`);
  
  const modelConfig = {
    name: 'MediScan Prescription OCR',
    version: '1.0.0',
    description: 'Custom CRNN model for prescription text recognition',
    drugs: COMMON_DRUGS,
    dosages: COMMON_DOSAGES,
    inputShape: [IMAGE_HEIGHT, IMAGE_WIDTH, 1],
    numDrugClasses: NUM_DRUG_CLASSES + 1,
    numDosageClasses: NUM_DOSAGE_CLASSES + 1,
    numFrequencyClasses: 100
  };
  
  fs.writeFileSync(
    path.join(finalPath, 'model-config.json'),
    JSON.stringify(modelConfig, null, 2)
  );
  
  console.log(`Final model saved to ${finalPath}`);
  console.log('Copy the model files to public/models/ocr/ in your main project');
  
  tf.dispose();
}

train().catch(err => {
  console.error('Training error:', err);
  process.exit(1);
});
