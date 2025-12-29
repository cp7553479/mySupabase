/**
 * 飞书多维表格字段值转换工具
 * 将飞书多维表格字段值转换为简化格式
 * 
 * 转换规则：
 * - 多行文本：[{type:"text",text:"xxx"}] → "xxx"（拼接所有text）
 * - 公式字段：{type,value} → 提取value并递归处理
 * - 日期时间：毫秒时间戳 → ISO 8601格式字符串
 * - 其他字段类型保持原样不变
 * 
 * 异常处理：
 * - 字段转换失败时记录警告并保留原始值
 * - 调用方可选择使用try/catch捕获异常
 * 
 * 提供两个函数：
 * 1. transformFieldValue(fieldValue) - 自动识别字段类型进行转换
 * 2. transformFieldValueByType(fieldValue, type) - 根据指定的飞书字段类型进行转换
 */

/**
 * 飞书多维表格字段值转换工具
 * 将飞书多维表格字段值转换为简化格式
 * 
 * 转换规则：
 * - 多行文本：[{type:"text",text:"xxx"}] → "xxx"（拼接所有text）
 * - 公式字段：{type,value} → 提取value并递归处理
 * - 日期时间：毫秒时间戳 → ISO 8601格式字符串
 * - 其他字段类型保持原样不变
 * 
 * 异常处理：
 * - 字段转换失败时记录警告并保留原始值
 * - 调用方可选择使用try/catch捕获异常
 */

/**
 * 转换单个字段值（自动识别类型）
 * 
 * 转换原理：
 * - 只转换多行文本字段和公式字段
 * - 多行文本：[{type:"text",text:"xxx"}] → "xxx"（拼接所有text）
 * - 公式字段：{type,value} → 提取value并递归处理
 * - 日期时间：转换为PostgreSQL timestampz格式
 * - 其他字段类型保持原样不变
 * 
 * 注意：此函数通过字段值的结构自动识别类型，适用于不知道具体字段类型的场景
 * 如果已知字段类型，建议使用 transformFieldValueByType 函数以获得更精确的转换
 * 
 * @param fieldValue 飞书字段值（任意格式）
 * @returns 转换后的值
 */
export function transformFieldValue(fieldValue: any): any {
  // 空值处理
  if (fieldValue === null || fieldValue === undefined) {
    return fieldValue;
  }

  // 1. 处理公式字段：{type, value} 格式
  if (typeof fieldValue === 'object' && !Array.isArray(fieldValue) && 
      'type' in fieldValue && 'value' in fieldValue) {
    // 递归处理value值
    return transformFieldValue(fieldValue.value);
  }

  // 2. 处理多行文本字段：[{type:"text", text:"xxx"}] 格式
  if (Array.isArray(fieldValue) && fieldValue.length > 0) {
    const first = fieldValue[0];
    if (typeof first === 'object' && first !== null && 
        'type' in first && 'text' in first && first.type === 'text') {
      // 拼接所有text字段
      return fieldValue
        .filter(item => item && typeof item === 'object' && 'text' in item)
        .map(item => item.text || '')
        .join('');
    }
  }

  // 3. 处理日期时间字段：转换为PostgreSQL timestampz格式
  if (typeof fieldValue === 'number' && fieldValue > 0) {
    // 检查是否为时间戳（毫秒）
    const date = new Date(fieldValue);
    if (!isNaN(date.getTime()) && fieldValue > 1000000000000) { // 大于2001年的毫秒时间戳
      return date.toISOString(); // 返回ISO 8601格式，PostgreSQL可以直接识别
    }
  }

  // 4. 其他所有字段类型保持原样不变
  return fieldValue;
}

/**
 * 根据飞书字段类型转换字段值
 * 
 * 飞书字段类型对应表：
 * 1：文本 - 多行文本拼接为字符串
 * 2：数字 - 保持原样
 * 3：单选 - 保持原样
 * 4：多选 - 保持原样
 * 5：日期 - 毫秒时间戳转ISO 8601格式
 * 7：复选框 - 保持原样
 * 11：人员 - 保持原样
 * 13：电话号码 - 保持原样
 * 15：超链接 - 保持原样
 * 17：附件 - 保持原样
 * 18：关联 - 保持原样
 * 20：公式 - 提取value并递归处理
 * 21：双向关联 - 保持原样
 * 22：地理位置 - 保持原样
 * 23：群组 - 保持原样
 * 
 * @param fieldValue 飞书字段值（任意格式）
 * @param type 飞书字段类型（整数）
 * @returns 转换后的值
 */
export function transformFieldValueByType(fieldValue: any, type: number): any {
  // 空值处理
  if (fieldValue === null || fieldValue === undefined) {
    return fieldValue;
  }

  switch (type) {
    case 1: // 文本 - 处理多行文本字段
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        const first = fieldValue[0];
        if (typeof first === 'object' && first !== null && 
            'type' in first && 'text' in first && first.type === 'text') {
          // 拼接所有text字段
          return fieldValue
            .filter(item => item && typeof item === 'object' && 'text' in item)
            .map(item => item.text || '')
            .join('');
        }
      }
      return fieldValue;

    case 2: // 数字
      return fieldValue;

    case 3: // 单选
      return fieldValue;

    case 4: // 多选
      return fieldValue;

    case 5: // 日期 - 转换为PostgreSQL timestampz格式
      if (typeof fieldValue === 'number' && fieldValue > 0) {
        // 检查是否为时间戳（毫秒）
        const date = new Date(fieldValue);
        if (!isNaN(date.getTime()) && fieldValue > 1000000000000) { // 大于2001年的毫秒时间戳
          return date.toISOString(); // 返回ISO 8601格式，PostgreSQL可以直接识别
        }
      }
      return fieldValue;

    case 7: // 复选框
      return fieldValue;

    case 11: // 人员
      return fieldValue;

    case 13: // 电话号码
      return fieldValue;

    case 15: // 超链接
      return fieldValue;

    case 17: // 附件
      return fieldValue;

    case 18: // 关联
      return fieldValue;

    case 20: // 公式 - 提取value并递归处理
      if (typeof fieldValue === 'object' && !Array.isArray(fieldValue) && 
          'type' in fieldValue && 'value' in fieldValue) {
        // 递归处理value值，但需要知道value的实际类型
        // 这里使用原始的transformFieldValue函数来处理
        return transformFieldValue(fieldValue.value);
      }
      return fieldValue;

    case 21: // 双向关联
      return fieldValue;

    case 22: // 地理位置
      return fieldValue;

    case 23: // 群组
      return fieldValue;

    default:
      // 未知类型保持原样
      return fieldValue;
  }
}