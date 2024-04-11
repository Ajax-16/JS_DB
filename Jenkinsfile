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
        stage("Push to Github") {
            steps {
                
                sh 'git remote rm github'

                sh 'git remote add github https://$GITHUB_TOKEN@github.com/Ajax-16/nuedb-core.git'

                sh 'git pull github feature'
                
                sh 'git push --mirror --exclude=main github'
                    
            }
        }
    }
}
