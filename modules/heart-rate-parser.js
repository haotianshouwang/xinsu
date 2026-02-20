// 心率数据解析模块

// 解析心率测量数据
// 参考蓝牙心率服务规范（GATT Service Specification for Heart Rate）
export function parseHeartRateMeasurement(value) {
    try {
        if (!value || value.byteLength < 2) {
            throw new Error('无效的心率测量数据');
        }
        
        const flags = value.getUint8(0);
        let bpm;
        let energyExpended = null;
        let rrIntervals = [];
        
        // 解析心率值
        if (flags & 0x01) {
            // 16位心率值
            bpm = value.getUint16(1, true); // true表示小端序
        } else {
            // 8位心率值
            bpm = value.getUint8(1);
        }
        
        // 解析能量消耗值（如果存在）
        if (flags & 0x08) {
            const energyOffset = (flags & 0x01) ? 3 : 2;
            if (value.byteLength > energyOffset + 1) {
                energyExpended = value.getUint16(energyOffset, true);
            }
        }
        
        // 解析RR间隔值（如果存在）
        if (flags & 0x10) {
            let rrOffset = (flags & 0x01) ? 3 : 2;
            if (flags & 0x08) {
                rrOffset += 2; // 跳过能量消耗值
            }
            
            while (value.byteLength > rrOffset + 1) {
                const rrInterval = value.getUint16(rrOffset, true);
                rrIntervals.push(rrInterval);
                rrOffset += 2;
            }
        }
        
        return {
            bpm,
            energyExpended,
            rrIntervals,
            flags
        };
    } catch (error) {
        console.error('解析心率数据时出错:', error);
        throw error;
    }
}

// 验证心率值是否有效
export function isValidHeartRate(bpm) {
    return bpm > 0 && bpm < 300;
}

// 格式化心率数据为调试字符串
export function formatHeartRateData(data) {
    let str = `BPM: ${data.bpm}`;
    
    if (data.energyExpended !== null) {
        str += ` | Energy: ${data.energyExpended} kJ`;
    }
    
    if (data.rrIntervals.length > 0) {
        str += ` | RR: [${data.rrIntervals.join(', ')}] ms`;
    }
    
    str += ` | Flags: 0x${data.flags.toString(16).padStart(2, '0')}`;
    
    return str;
}
