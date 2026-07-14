package com.pypecrm.app.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "leads", indices = [Index(value = ["phone"], unique = true)])
data class LeadEntity(
    @PrimaryKey val id: String,
    val firstName: String,
    val lastName: String,
    val phone: String
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntry(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val type: String, // "CALL_LOG", "WHATSAPP", "RECORDING"
    val payload: String, // JSON payload
    val filePath: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val attempts: Int = 0
)

@Entity(tableName = "call_buffer")
data class CallBufferEntity(
    @PrimaryKey val callSessionId: String,
    val phoneNumber: String,
    val startTime: Long,
    val type: String,
    var recordingPath: String? = null,
    var isConsolidated: Boolean = false,
    var status: Int = 0, // 0: PENDING, 1: PROCESSING, 2: COMPLETED
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface LeadDao {
    @Query("SELECT * FROM leads WHERE phone = :phoneNumber OR phone LIKE '%' || :phoneNumber OR :phoneNumber LIKE '%' || phone LIMIT 1")
    fun findLeadByPhone(phoneNumber: String): LeadEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertAll(vararg leads: LeadEntity)

    @Query("DELETE FROM leads")
    fun deleteAll()

    @Query("SELECT * FROM leads")
    fun getAllLeads(): List<LeadEntity>
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue ORDER BY createdAt ASC")
    fun getAllPending(): List<SyncQueueEntry>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(entry: SyncQueueEntry)

    @Delete
    fun delete(entry: SyncQueueEntry)

    @Query("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = :id")
    fun incrementAttempts(id: Int)
}

@Dao
interface CallBufferDao {
    @Query("SELECT * FROM call_buffer WHERE status = 0 ORDER BY createdAt ASC")
    fun getUnconsolidated(): List<CallBufferEntity>

    @Query("SELECT * FROM call_buffer WHERE callSessionId = :sessionId LIMIT 1")
    fun getBySessionId(sessionId: String): CallBufferEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(entry: CallBufferEntity)

    @Query("UPDATE call_buffer SET status = 1 WHERE callSessionId = :sessionId AND status = 0")
    fun markAsProcessing(sessionId: String): Int

    @Update
    fun update(entry: CallBufferEntity)

    @Query("DELETE FROM call_buffer WHERE isConsolidated = 1 OR createdAt < :timestamp")
    fun cleanup(timestamp: Long)
}

@Database(entities = [LeadEntity::class, SyncQueueEntry::class, CallBufferEntity::class], version = 4, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun leadDao(): LeadDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun callBufferDao(): CallBufferDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "crm_lead_database"
                )
                .fallbackToDestructiveMigration() // Simple for now, can add migration logic if needed
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
