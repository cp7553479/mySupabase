/// <reference lib="deno.ns" />
/// <reference lib="dom" />

/**
 * Supabase Edge Function: delete-storage
 * 
 * ========================================
 * 程序运行原理和工作流程
 * ========================================
 *
 * 【核心功能】
 * 删除Supabase Storage中的所有文件和buckets
 * 支持安全删除，包含确认机制
 *
 * 【工作流程】
 * 1. 列出所有storage buckets
 * 2. 遍历每个bucket，列出所有文件
 * 3. 删除每个bucket中的所有文件
 * 4. 删除所有buckets
 *
 * 【输入格式】
 * {
 *   "confirm_delete": true  // 必须为true才会执行删除操作
 * }
 *
 * 【输出格式】
 * 成功情况：
 * {
 *   "success": true,
 *   "buckets_deleted": ["bucket1", "bucket2"],
 *   "files_deleted": [
 *     {"bucket": "bucket1", "files": ["file1.jpg", "file2.pdf"]},
 *     {"bucket": "bucket2", "files": ["file3.png"]}
 *   ],
 *   "total_files_deleted": 3,
 *   "total_buckets_deleted": 2
 * }
 */

import { supabaseClient } from '../_shared/supabaseClient.ts';

interface DeleteStorageRequest {
  confirm_delete: boolean;
}

interface DeleteStorageResponse {
  success: boolean;
  buckets_deleted?: string[];
  files_deleted?: Array<{
    bucket: string;
    files: string[];
  }>;
  total_files_deleted?: number;
  total_buckets_deleted?: number;
  error?: string;
}

/**
 * 列出所有storage buckets
 */
async function listBuckets(): Promise<string[]> {
  console.log('[listBuckets] 开始列出所有buckets');
  
  try {
    const { data, error } = await supabaseClient.storage.listBuckets();
    
    if (error) {
      console.error('[listBuckets] 错误:', error.message);
      throw new Error(`列出buckets失败: ${error.message}`);
    }
    
    const bucketNames = data?.map(bucket => bucket.name) || [];
    console.log('[listBuckets] 找到buckets:', bucketNames);
    
    return bucketNames;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error('[listBuckets] 异常:', errMsg);
    throw err;
  }
}

/**
 * 列出指定bucket中的所有文件
 */
async function listFilesInBucket(bucketName: string): Promise<string[]> {
  console.log(`[listFilesInBucket] 列出bucket "${bucketName}" 中的文件`);
  
  try {
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .list('', {
        limit: 1000,  // 限制每次查询的文件数量
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error(`[listFilesInBucket] 错误 bucket="${bucketName}":`, error.message);
      throw new Error(`列出bucket "${bucketName}" 文件失败: ${error.message}`);
    }
    
    // 递归获取所有文件（包括子目录中的文件）
    const allFiles: string[] = [];
    
    async function getAllFiles(path: string = '') {
      const { data: items, error } = await supabaseClient.storage
        .from(bucketName)
        .list(path, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error(`[listFilesInBucket] 错误 path="${path}":`, error.message);
        return;
      }
      
      if (items) {
        for (const item of items) {
          const fullPath = path ? `${path}/${item.name}` : item.name;
          
          if (item.metadata?.mimetype) {
            // 这是一个文件
            allFiles.push(fullPath);
            console.log(`[listFilesInBucket] 找到文件: ${fullPath}`);
          } else {
            // 这是一个文件夹，递归查找
            await getAllFiles(fullPath);
          }
        }
      }
    }
    
    await getAllFiles();
    
    console.log(`[listFilesInBucket] bucket "${bucketName}" 总共找到 ${allFiles.length} 个文件`);
    return allFiles;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[listFilesInBucket] 异常 bucket="${bucketName}":`, errMsg);
    throw err;
  }
}

/**
 * 删除指定bucket中的所有文件
 */
async function deleteFilesInBucket(bucketName: string, filePaths: string[]): Promise<number> {
  console.log(`[deleteFilesInBucket] 开始删除bucket "${bucketName}" 中的 ${filePaths.length} 个文件`);
  
  let deletedCount = 0;
  
  try {
    // 批量删除文件（Supabase支持批量删除）
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .remove(filePaths);
    
    if (error) {
      console.error(`[deleteFilesInBucket] 批量删除失败 bucket="${bucketName}":`, error.message);
      throw new Error(`删除bucket "${bucketName}" 文件失败: ${error.message}`);
    }
    
    deletedCount = data?.length || filePaths.length;
    console.log(`[deleteFilesInBucket] 成功删除 ${deletedCount} 个文件`);
    
    return deletedCount;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[deleteFilesInBucket] 异常 bucket="${bucketName}":`, errMsg);
    throw err;
  }
}

/**
 * 删除指定的bucket
 */
async function deleteBucket(bucketName: string): Promise<void> {
  console.log(`[deleteBucket] 删除bucket "${bucketName}"`);
  
  try {
    const { error } = await supabaseClient.storage.deleteBucket(bucketName);
    
    if (error) {
      console.error(`[deleteBucket] 错误 bucket="${bucketName}":`, error.message);
      throw new Error(`删除bucket "${bucketName}" 失败: ${error.message}`);
    }
    
    console.log(`[deleteBucket] 成功删除bucket "${bucketName}"`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[deleteBucket] 异常 bucket="${bucketName}":`, errMsg);
    throw err;
  }
}

/**
 * 主处理函数
 */
Deno.serve(async (req) => {
  console.log('[delete-storage] 开始处理请求');
  
  try {
    // 解析请求体
    const body: DeleteStorageRequest = await req.json();
    console.log('[delete-storage] 请求参数:', body);
    
    // 验证确认参数
    if (!body.confirm_delete) {
      const response: DeleteStorageResponse = {
        success: false,
        error: "必须设置 confirm_delete: true 才能执行删除操作"
      };
      console.log('[delete-storage] 缺少确认参数');
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[delete-storage] 开始删除storage中的所有内容');
    
    // 1. 列出所有buckets
    const buckets = await listBuckets();
    
    if (buckets.length === 0) {
      console.log('[delete-storage] 没有找到任何buckets');
      const response: DeleteStorageResponse = {
        success: true,
        buckets_deleted: [],
        files_deleted: [],
        total_files_deleted: 0,
        total_buckets_deleted: 0
      };
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[delete-storage] 找到 ${buckets.length} 个buckets:`, buckets);
    
    const filesDeleted: Array<{ bucket: string; files: string[] }> = [];
    let totalFilesDeleted = 0;
    
    // 2. 遍历每个bucket，删除其中的文件
    for (const bucketName of buckets) {
      console.log(`\n=== 处理bucket: ${bucketName} ===`);
      
      try {
        // 列出bucket中的所有文件
        const files = await listFilesInBucket(bucketName);
        
        if (files.length > 0) {
          // 删除文件
          const deletedCount = await deleteFilesInBucket(bucketName, files);
          filesDeleted.push({
            bucket: bucketName,
            files: files
          });
          totalFilesDeleted += deletedCount;
          console.log(`[delete-storage] bucket "${bucketName}" 删除了 ${deletedCount} 个文件`);
        } else {
          console.log(`[delete-storage] bucket "${bucketName}" 中没有文件`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[delete-storage] 处理bucket "${bucketName}" 时出错:`, errMsg);
        // 继续处理其他buckets，不中断整个流程
      }
    }
    
    console.log(`\n=== 开始删除buckets ===`);
    
    // 3. 删除所有buckets
    const deletedBuckets: string[] = [];
    for (const bucketName of buckets) {
      try {
        await deleteBucket(bucketName);
        deletedBuckets.push(bucketName);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[delete-storage] 删除bucket "${bucketName}" 失败:`, errMsg);
        // 继续删除其他buckets
      }
    }
    
    // 4. 返回结果
    const response: DeleteStorageResponse = {
      success: true,
      buckets_deleted: deletedBuckets,
      files_deleted: filesDeleted,
      total_files_deleted: totalFilesDeleted,
      total_buckets_deleted: deletedBuckets.length
    };
    
    console.log('[delete-storage] 删除操作完成:', {
      buckets_deleted: deletedBuckets.length,
      total_files_deleted: totalFilesDeleted,
      total_buckets_deleted: deletedBuckets.length
    });
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error('[delete-storage] 处理异常:', errMsg);
    
    const response: DeleteStorageResponse = {
      success: false,
      error: errMsg
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
