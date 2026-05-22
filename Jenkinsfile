pipeline {
    agent any

    options {
        timeout(time: 10, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Set Permissions') {
            steps {
                sh 'chmod +x ./scripts/manage.sh'
            }
        }

        stage('Deploy to Production') {
            steps {
                sh './scripts/manage.sh restart'
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Polyglot Engine deployed and live!'
        }
        failure {
            echo 'CRITICAL: Deployment failed. Please check the Jenkins logs.'
        }
        always {
            sh 'docker image prune -f'
        }
    }
}