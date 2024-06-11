pipeline {
  agent any 
  tools {
    nodejs "npm"
  }
  environment {
    GITHUB_TOKEN = credentials('github_key')
  }
  stages {
    stage("Clone Git repository") {
      steps {
        sh 'git config --global user.name "Ajax-16"'
        sh 'git config --global user.email "davidbernardezluque7618@gmail.com"'
        git url: 'http://gitlab:30080/root/nuedb-core.git', branch: 'feature', credentialsId: 'git_user_pass'
      }
    }
    stage("Build dependencies") {
      steps {
        sh 'npm install'
      }
    }
    stage("Testing") {
      steps {
        sh 'npm run test'
      }
    }
    stage('SCM') {
    checkout scm
    }
    stage('SonarQube Analysis') {
      def scannerHome = tool 'SonarScanner';
      withSonarQubeEnv() {
        sh "${scannerHome}/bin/sonar-scanner"
      }
    }
    stage("Push to Github") {
      steps {
        sh 'git remote add github https://$GITHUB_TOKEN@github.com/Ajax-16/nuedb-core.git'
        sh 'git push github'
        sh 'git remote rm github'
      }
    }
    stage("publish latest version to npm") {
      steps {
        withCredentials([string(credentialsId: 'NPM_TOKEN', variable: 'TOKEN')]) {
          script {
            sh 'echo "//registry.npmjs.org/:_authToken=${TOKEN}" >> ~/.npmrc'
            sh 'npm publish'
          }
        }
      }
    }
  }
}