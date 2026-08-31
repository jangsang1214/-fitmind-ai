Object.assign(window.GARANG_UI_TRANSLATIONS,{
 '운동 DB에 MET 기본값이 있으면 그대로 사용하고, RPE에 따라 완만하게 보정합니다.':'Uses the exercise database MET estimate with a small RPE adjustment.',
 '아직 추가한 운동이 없어요. 위에서 운동을 추가하세요.':'No exercises added. Add an exercise above.',
 '사진/영상을 선택하면 GARANG VERIFIED 오버레이를 실제 이미지에 합성할 수 있습니다.':'Choose a photo or video to composite the GARANG overlay onto your media.',
 '사진/영상 선택':'Choose photo/video','바벨 벤치프레스':'Barbell bench press','닭가슴살':'Chicken breast',
 '음식명, g':'Food name, grams','한 끼에 넣을 음식을 계속 추가하세요.':'Add foods to your meal.','끼니 총 kcal':'Meal calories','단백질':'Protein','탄수화물':'Carbs','지방':'Fat',
 '분/km':'min/km','프로필 저장':'Save profile','퍼포먼스 향상':'Improve performance','PRO 전환 준비':'Upgrade to PRO','현재 사용 중':'Currently active',
 '체지방량 kg':'Fat mass (kg)','데이터 관리':'Data management',
 '운동 종목을 입력해 주세요.':'Enter an exercise.','DB에서 음식을 찾지 못했어요.':'Food not found in the database.',
 '음식 값을 수정한 뒤 다시 추가해 주세요.':'Edit the food values and add it again.','운동 값을 수정한 뒤 다시 추가해 주세요.':'Edit the exercise values and add it again.',
 '여러 음식 입력란을 채워 주세요.':'Enter foods in the batch field.','진행 중인 러닝이 없어요.':'No run is in progress.',
 'GPS 권한 또는 위치 신호를 확인해 주세요.':'Check GPS permission and location signal.','GPS 권한 또는 신호를 확인해 주세요.':'Check GPS permission or signal.',
 '이 기기에서는 GPS를 사용할 수 없어요.':'GPS is unavailable on this device.','GPS 러닝을 시작했어요.':'GPS run started.',
 '알림 권한 요청을 완료하지 못했어요.':'Could not request notification permission.','플래너 알림이 켜졌어요.':'Planner notifications enabled.',
 '오늘 계획은 현재 상태에 맞게 이미 구성되어 있어요.':'Today’s suggested plans are already added.',
 '인증 사진/영상':'Verification photo/video','오버레이 이미지 저장':'Save composited image','영상 합성 저장/공유':'Save/share composited video',
 '로컬 저장 공간을 확인해 주세요.':'Check local storage space.','이미지를 읽을 수 없어요.':'Could not read this image.','이미지 합성에 실패했어요.':'Image composition failed.',
 '계정 데이터 동기화에 실패했어요.':'Account sync failed.',
 '현재 데이터를 백업으로 복원할까요?':'Replace current data with the backup?',
 '계정 없이도 로컬 데모로 앱 구조를 둘러볼 수 있습니다.':'Use local mode without an account.',
 '데모로 시작하기':'Start local mode','로그인':'Log in','회원가입':'Sign up','이메일':'Email','비밀번호':'Password','비밀번호 재설정':'Reset password','계정 만들기':'Create account','Google로 계속':'Continue with Google','Apple로 계속':'Continue with Apple','또는':'or',
 '사진 촬영':'Take photo','사진 파일 업로드':'Upload image'
});
// Legacy dynamic UI text uses anchored patterns. User content is explicitly excluded by callers.
window.GarangTranslateDynamic=function(text,language){
 if(language!=='en')return text;
 const dict=window.GARANG_UI_TRANSLATIONS;if(dict[text])return dict[text];
 return text
 .replace(/^현재 체중 (.*?)kg · 오늘 섭취 (.*?) kcal · 단백질 (.*?)g · 운동 소모 약 (.*?) kcal$/, 'Weight $1 kg · Intake $2 kcal · Protein $3 g · Estimated workout burn $4 kcal')
 .replace(/^오늘 약 (.*?) kcal$/,'Today approximately $1 kcal').replace(/^약 (.*?) kcal$/,'Approximately $1 kcal')
 .replace(/^(\d+)개$/,'$1').replace(/^(.*?)분 · MET (.*?) · 약 (.*?) kcal$/,'$1 min · MET $2 · approximately $3 kcal')
 .replace(/^(.*?) · (.*?)분 · (.*?) \/km$/,'$1 · $2 min · $3 /km')
 .replace(/^(.*?) 추가 · 약 (.*?) kcal$/,'$1 added · approximately $2 kcal')
 .replace(/^운동 세션 저장 완료 · 약 (.*?) kcal$/,'Workout session saved · approximately $1 kcal')
 .replace(/^한 끼 저장 완료 · (.*?) kcal$/,'Meal saved · $1 kcal')
 .replace(/^(.*?) 영양정보를 불러왔어요\.$/,'Nutrition loaded: $1')
 .replace(/^(.*?) 추가$/,'Added: $1').replace(/^(\d+)개의 맞춤 계획을 추가했어요\.$/,'Added $1 suggested plans.');
};
