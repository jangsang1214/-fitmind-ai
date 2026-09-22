'use strict';
const assert=require('node:assert/strict');
const db=require('../04_data/knowledge/exercise-db.json');
assert.equal(db.length,300,'exercise corpus must remain 300 rows');
const allowedEquipment=new Set(['smith_machine','barbell','ez_bar','dumbbell','kettlebell','cable','machine','resistance_band','suspension_trainer','rings','landmine','weight_plate','stability_ball','battle_rope','sled','sandbag','medicine_ball','climbing_rope','free_weight_carry','external_load','ab_wheel','bodyweight']);
const allowedMovement=new Set(['horizontal_push','vertical_push','vertical_pull','horizontal_pull','shoulder_isolation','elbow_flexion','elbow_extension','hip_hinge','squat_lunge','knee_extension','knee_flexion','hip_abduction','hip_adduction','plantar_flexion','core_flexion','core_stability','core_rotation','core_anti_extension','power_complex','loaded_carry','conditioning','general_resistance']);
for(const row of db){
  assert.ok(row.equipment,'equipment must be classified');
  assert.ok(row.movement_type,'movement type must be classified');
  assert.equal(typeof row.is_compound,'boolean','compound flag must be boolean');
  assert.ok(allowedEquipment.has(row.equipment),`unexpected equipment: ${row.equipment}`);
  assert.ok(allowedMovement.has(row.movement_type),`unexpected movement: ${row.movement_type}`);
  assert.equal(row.metadata_status,'rule_classified');
  assert.equal(row.metadata_source,'GARANG exercise taxonomy v1');
  assert.ok(Number(row.metadata_confidence)>=0.7&&Number(row.metadata_confidence)<=1);
}
const byName=name=>db.find(row=>row.exercise_name===name);
assert.deepEqual([byName('바벨 벤치프레스').equipment,byName('바벨 벤치프레스').movement_type,byName('바벨 벤치프레스').is_compound],['barbell','horizontal_push',true]);
assert.deepEqual([byName('랫풀다운').equipment,byName('랫풀다운').movement_type,byName('랫풀다운').is_compound],['bodyweight','vertical_pull',true]);
assert.deepEqual([byName('덤벨 레터럴레이즈').equipment,byName('덤벨 레터럴레이즈').movement_type,byName('덤벨 레터럴레이즈').is_compound],['dumbbell','shoulder_isolation',false]);
assert.deepEqual([byName('루마니안 데드리프트').equipment,byName('루마니안 데드리프트').movement_type,byName('루마니안 데드리프트').is_compound],['barbell','hip_hinge',true]);
assert.deepEqual([byName('백스쿼트').equipment,byName('백스쿼트').movement_type,byName('백스쿼트').is_compound],['bodyweight','squat_lunge',true]);
console.log('exercise-knowledge-taxonomy-v1: PASS');
