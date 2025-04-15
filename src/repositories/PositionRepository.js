import Position from '../models/Position.js'; // Adjust the path as needed

class PositionRepository {
  static async createPosition(data) {
    try {
      const newPosition = await Position.query().insert(data);
      return newPosition;
    } catch (error) {
      throw new Error(`Error creating position: ${error.message}`);
    }
  }

  static async updatePosition(id, updates) {
    try {
      const updatedPosition = await Position.query().patchAndFetchById(id, updates);
      return updatedPosition;
    } catch (error) {
      throw new Error(`Error updating position: ${error.message}`);
    }
  }
  static async findFirst() {
    try {
      const position = await Position.query().first();
      return position;
    } catch (error) {
      throw new Error(`Error finding setting: ${error.message}`);
    }
  }

  static async findByOrderId(orderId) {
    try {
      const position = await Position.query()
        .where('first_order_id', orderId)
        .orWhere('second_order_id', orderId)
        .first();
      return position;
    } catch (error) {
      throw new Error(`Error finding position by order ID: ${error.message}`);
    }
  }

  static async getLastOrderWithoutMatch() {
    try {
      const position = await Position.query()
        .where('is_in_process', 1)
        .whereNull('second_order_id')
        .orderBy('id', 'desc')
        .first();
      return position;
    } catch (error) {
      throw new Error(`Error finding last position without match: ${error.message}`);
    }
  }

  static async getAllInProcessOrders() {
    try {
      const positions = await Position.query().where('is_in_process', 1).orderBy('id','desc');
      return positions;
    } catch (error) {
      throw new Error(`Error finding all in process positions: ${error.message}`);
    }
  }
//getAllOrders
 static async getAllOrders() {
    try {
      const positions = await Position.query().orderBy('id','desc');
      return positions;
    } catch (error) {
      throw new Error(`Error finding all in process positions: ${error.message}`);
    }
  }

  static async lastInProcess() {
    try {
      const position = await Position.query().where('is_in_process', 1).orderBy('id','desc').first();
      return position;
    } catch (error) {
      throw new Error(`Error finding last in process position: ${error.message}`);
    }
  }
}

export default PositionRepository;
