import Setting from '../models/Setting.js'; // Adjust the path as needed

class SettingRepository {
  static async findOrCreateFirst() {
    try {
      let setting = await Setting.query().first();
      if (!setting) {
        setting = await Setting.query().insert({
          start_time: Date.now(),
          last_handled_time: null,
          last_handled_order_id: null,
          wait_for: 'order',
        });
      }
      return setting;
    } catch (error) {
      throw new Error(`Error finding setting: ${error.message}`);
    }
  }
  static async updateWaitFor(wait_for) {
    try {

      let setting = await Setting.query().update({
        wait_for: wait_for
      });
      return setting;
    } catch (error) {
      throw new Error(`Error update setting: ${error.message}`);
    }
  }
  static async updateExtraInfo(extraInfo) {
    try {

      let setting = await Setting.query().update({
        extra_info: JSON.stringify(extraInfo)
      });
      return setting;
    } catch (error) {
      throw new Error(`Error update extra info setting: ${error.message}`);
    }
  }
}

export default SettingRepository;
