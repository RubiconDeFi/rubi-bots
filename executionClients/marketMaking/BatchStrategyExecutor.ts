import { BigNumber } from 'ethers';
import { EventEmitter } from 'events';

// Define the event types that the BatchStrategyExecutor will listen to
interface BatchStrategyExecutorEvents {
  on(event: 'addToBatch', listener: (data: any) => void): this;
  emit(event: 'addToBatch', data: any): boolean;
}

class BatchStrategyExecutor extends (EventEmitter as { new (): BatchStrategyExecutorEvents }) {
  private batch: any[]; // Replace 'any' with the appropriate data type for the batch elements
  private batchInProgress: boolean;

  constructor() {
    super();
    this.batch = [];
    this.batchInProgress = false;

    // Bind event listeners
    this.on('addToBatch', this.handleAddToBatch);
  }

  // Event handler for 'addToBatch'
  private handleAddToBatch(data: any): void {
    // Add the data to the batch and trigger the execution if necessary
    this.addToBatch(data);
    if (!this.batchInProgress) {
      this.executeBatch();
    }
  }

  private addToBatch(data: any): void {
    // Implement the logic for adding data to the batch
    this.batch.push(data);
  }

  private async executeBatch(): Promise<void> {
    this.batchInProgress = true;

    // Implement the logic for executing the batch

    this.batchInProgress = false;
  }

  // Add any other necessary methods and properties for the BatchStrategyExecutor class
}

export default BatchStrategyExecutor;
