
/*
 GARANG V9.3.1 SERVER ADAPTER
 - Firebase Auth / Firestore are intentionally loaded only when configured.
 - Never put service-account credentials in this client.
 - Personal data and global-learning data use separate collections.
*/
window.GARANG_SERVER = {
  configured: false,
  firebaseConfig: null,
  user: null,
  consent: {globalLearning:false},
  async init(config){
    this.firebaseConfig=config;
    if(!config || !config.apiKey) return false;
    // Firebase SDK can be injected by the deployment page/build system.
    if(!window.firebase) return false;
    try{
      if(!firebase.apps.length) firebase.initializeApp(config);
      this.auth=firebase.auth();
      this.db=firebase.firestore();
      if (this.auth.setPersistence && firebase.auth.Auth?.Persistence?.LOCAL) {
        await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      }
      this.auth.onAuthStateChanged(u=>{this.user=u||null;});
      this.configured=true;
      return true;
    }catch(e){ console.error("GARANG Firebase init failed",e); return false; }
  },
  async savePersonal(path,data){
    if(!this.configured || !this.user) return false;
    await this.db.collection("users").doc(this.user.uid).collection(path).add(data);
    return true;
  },
  async saveLearning(event){
    if(!this.configured || !this.user || !this.consent.globalLearning) return false;
    // Only send the minimum generalized context required for global learning.
    const safe={
      eventType:event.eventType,
      context:{
        goal:event.context?.goal||null,
        experience:event.context?.experience||null
      },
      outcome:event.outcome||null,
      actionSummary:event.actionSummary||event.eventType,
      quality:event.quality||{},
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    await this.db.collection("globalLearningEvents").add(safe);
    return true;
  },
  async setConsent(enabled){
    this.consent.globalLearning=!!enabled;
    if(this.configured && this.user){
      await this.db.collection("users").doc(this.user.uid).set(
        {consent:{globalLearning:!!enabled,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}},
        {merge:true}
      );
    }
  }
};
